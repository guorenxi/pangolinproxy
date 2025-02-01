"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatAxiosError } from "@app/lib/api";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { cn } from "@app/lib/cn";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { useResourceContext } from "@app/hooks/useResourceContext";
import { ListSitesResponse } from "@server/routers/site";
import { useEffect, useState } from "react";
import { AxiosResponse } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { GetResourceAuthInfoResponse } from "@server/routers/resource";
import { useToast } from "@app/hooks/useToast";
import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionHeader,
    SettingsSectionTitle,
    SettingsSectionDescription,
    SettingsSectionBody,
    SettingsSectionForm,
    SettingsSectionFooter
} from "@app/components/Settings";
import { useOrgContext } from "@app/hooks/useOrgContext";
import CustomDomainInput from "../CustomDomainInput";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { subdomainSchema } from "@server/schemas/subdomainSchema";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";

const GeneralFormSchema = z
    .object({
        subdomain: z.string().optional(),
        name: z.string().min(1).max(255),
        proxyPort: z.number().optional(),
        http: z.boolean()
    })
    .refine(
        (data) => {
            if (!data.http) {
                return z
                    .number()
                    .int()
                    .min(1)
                    .max(65535)
                    .safeParse(data.proxyPort).success;
            }
            return true;
        },
        {
            message: "Invalid port number",
            path: ["proxyPort"]
        }
    )
    .refine(
        (data) => {
            if (data.http) {
                return subdomainSchema.safeParse(data.subdomain).success;
            }
            return true;
        },
        {
            message: "Invalid subdomain",
            path: ["subdomain"]
        }
    );

const TransferFormSchema = z.object({
    siteId: z.number()
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;
type TransferFormValues = z.infer<typeof TransferFormSchema>;

export default function GeneralForm() {
    const params = useParams();
    const { toast } = useToast();
    const { resource, updateResource } = useResourceContext();
    const { org } = useOrgContext();
    const router = useRouter();

    const orgId = params.orgId;

    const api = createApiClient(useEnvContext());

    const [sites, setSites] = useState<ListSitesResponse["sites"]>([]);
    const [saveLoading, setSaveLoading] = useState(false);
    const [domainSuffix, setDomainSuffix] = useState(org.org.domain);
    const [transferLoading, setTransferLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(GeneralFormSchema),
        defaultValues: {
            name: resource.name,
            subdomain: resource.subdomain ? resource.subdomain : undefined,
            proxyPort: resource.proxyPort ? resource.proxyPort : undefined,
            http: resource.http
        },
        mode: "onChange"
    });

    const transferForm = useForm<TransferFormValues>({
        resolver: zodResolver(TransferFormSchema),
        defaultValues: {
            siteId: resource.siteId ? Number(resource.siteId) : undefined
        }
    });

    useEffect(() => {
        const fetchSites = async () => {
            const res = await api.get<AxiosResponse<ListSitesResponse>>(
                `/org/${orgId}/sites/`
            );
            setSites(res.data.data.sites);
        };
        fetchSites();
    }, []);

    async function onSubmit(data: GeneralFormValues) {
        setSaveLoading(true);

        api.post<AxiosResponse<GetResourceAuthInfoResponse>>(
            `resource/${resource?.resourceId}`,
            {
                name: data.name,
                subdomain: data.subdomain
                // siteId: data.siteId,
            }
        )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to update resource",
                    description: formatAxiosError(
                        e,
                        "An error occurred while updating the resource"
                    )
                });
            })
            .then(() => {
                toast({
                    title: "Resource updated",
                    description: "The resource has been updated successfully"
                });

                updateResource({ name: data.name, subdomain: data.subdomain });

                router.refresh();
            })
            .finally(() => setSaveLoading(false));
    }

    async function onTransfer(data: TransferFormValues) {
        setTransferLoading(true);

        api.post(`resource/${resource?.resourceId}/transfer`, {
            siteId: data.siteId
        })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to transfer resource",
                    description: formatAxiosError(
                        e,
                        "An error occurred while transferring the resource"
                    )
                });
            })
            .then(() => {
                toast({
                    title: "Resource transferred",
                    description:
                        "The resource has been transferred successfully"
                });
                router.refresh();
            })
            .finally(() => setTransferLoading(false));
    }

    return (
        <SettingsContainer>
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        General Settings
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        Configure the general settings for this resource
                    </SettingsSectionDescription>
                </SettingsSectionHeader>

                <SettingsSectionBody>
                    <SettingsSectionForm>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="general-settings-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                This is the display name of the
                                                resource.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {resource.http ? (
                                    <FormField
                                        control={form.control}
                                        name="subdomain"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Subdomain</FormLabel>
                                                <FormControl>
                                                    <CustomDomainInput
                                                        value={
                                                            field.value || ""
                                                        }
                                                        domainSuffix={
                                                            domainSuffix
                                                        }
                                                        placeholder="Enter subdomain"
                                                        onChange={(value) =>
                                                            form.setValue(
                                                                "subdomain",
                                                                value
                                                            )
                                                        }
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    This is the subdomain that
                                                    will be used to access the
                                                    resource.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ) : (
                                    <FormField
                                        control={form.control}
                                        name="proxyPort"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Port Number
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="Enter port number"
                                                        value={
                                                            field.value ?? ""
                                                        }
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value
                                                                    ? parseInt(
                                                                          e
                                                                              .target
                                                                              .value
                                                                      )
                                                                    : null
                                                            )
                                                        }
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    This is the port that will
                                                    be used to access the
                                                    resource.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </form>
                        </Form>
                    </SettingsSectionForm>
                </SettingsSectionBody>

                <SettingsSectionFooter>
                    <Button
                        type="submit"
                        loading={saveLoading}
                        disabled={saveLoading}
                        form="general-settings-form"
                    >
                        Save Settings
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>

            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        Transfer Resource
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        Transfer this resource to a different site
                    </SettingsSectionDescription>
                </SettingsSectionHeader>

                <SettingsSectionBody>
                    <SettingsSectionForm>
                        <Form {...transferForm}>
                            <form
                                onSubmit={transferForm.handleSubmit(onTransfer)}
                                className="space-y-4"
                                id="transfer-form"
                            >
                                <FormField
                                    control={transferForm.control}
                                    name="siteId"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>
                                                Destination Site
                                            </FormLabel>
                                            <Popover
                                                open={open}
                                                onOpenChange={setOpen}
                                            >
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className={cn(
                                                                "w-full justify-between",
                                                                !field.value &&
                                                                    "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value
                                                                ? sites.find(
                                                                      (site) =>
                                                                          site.siteId ===
                                                                          field.value
                                                                  )?.name
                                                                : "Select site"}
                                                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput
                                                            placeholder="Search sites..."
                                                            className="h-9"
                                                        />
                                                        <CommandEmpty>
                                                            No sites found.
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {sites.map(
                                                                (site) => (
                                                                    <CommandItem
                                                                        value={
                                                                            site.name
                                                                        }
                                                                        key={
                                                                            site.siteId
                                                                        }
                                                                        onSelect={() => {
                                                                            transferForm.setValue(
                                                                                "siteId",
                                                                                site.siteId
                                                                            );
                                                                            setOpen(
                                                                                false
                                                                            );
                                                                        }}
                                                                    >
                                                                        {
                                                                            site.name
                                                                        }
                                                                        <CheckIcon
                                                                            className={cn(
                                                                                "ml-auto h-4 w-4",
                                                                                site.siteId ===
                                                                                    field.value
                                                                                    ? "opacity-100"
                                                                                    : "opacity-0"
                                                                            )}
                                                                        />
                                                                    </CommandItem>
                                                                )
                                                            )}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            <FormDescription>
                                                Select the site you want to
                                                transfer this resource to
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </SettingsSectionForm>
                </SettingsSectionBody>

                <SettingsSectionFooter>
                    <Button
                        type="submit"
                        loading={transferLoading}
                        disabled={transferLoading}
                        form="transfer-form"
                        variant="destructive"
                    >
                        Transfer Resource
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>
        </SettingsContainer>
    );
}
