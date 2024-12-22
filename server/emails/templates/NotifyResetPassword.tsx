import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Tailwind
} from "@react-email/components";
import * as React from "react";

interface Props {
    email: string;
}

export const ConfirmPasswordReset = ({ email }: Props) => {
    const previewText = `Your password has been reset`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                primary: "#16A34A"
                            }
                        }
                    }
                }}
            >
                <Body className="font-sans">
                    <Container className="bg-white border border-solid border-gray-200 p-6 max-w-lg mx-auto my-8 rounded-lg">
                        <Heading className="text-2xl font-semibold text-gray-800 text-center">
                            Your password has been successfully reset
                        </Heading>
                        <Text className="text-base text-gray-700 mt-4">
                            Hi {email || "there"},
                        </Text>
                        <Text className="text-base text-gray-700 mt-2">
                            This email confirms that your password has just been
                            reset. If you made this change, no further action is
                            required.
                        </Text>
                        <Section className="text-center my-6">
                            <Text className="text-base text-gray-700">
                                If you did not request this change, please
                                contact our support team immediately.
                            </Text>
                        </Section>
                        <Text className="text-base text-gray-700 mt-2">
                            Thank you for keeping your account secure.
                        </Text>
                        <Text className="text-sm text-gray-500 mt-6">
                            Best regards,
                            <br />
                            Fossorial
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default ConfirmPasswordReset;
