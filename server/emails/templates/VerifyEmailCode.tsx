import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";

interface VerifyEmailProps {
    username?: string;
    verificationCode: string;
    verifyLink: string;
}

export const VerifyEmail = ({
    username,
    verificationCode,
    verifyLink,
}: VerifyEmailProps) => {
    const previewText = `Verify your email, ${username}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                primary: "#F97317",
                            },
                        },
                    },
                }}
            >
                <Body className="font-sans">
                    <Container className="bg-white border border-solid border-gray-200 p-6 max-w-lg mx-auto my-8 rounded-lg">
                        <Heading className="text-2xl font-semibold text-gray-800 text-center">
                            Please verify your email
                        </Heading>
                        <Text className="text-base text-gray-700 mt-4">
                            Hi {username || "there"},
                        </Text>
                        <Text className="text-base text-gray-700 mt-2">
                            You’ve requested to verify your email. Please{" "}
                            <a href={verifyLink} className="text-primary">
                                click here
                            </a>{" "}
                            to verify your email, then enter the following code:
                        </Text>
                        <Section className="text-center my-6">
                            <Text className="inline-block bg-primary text-xl font-bold text-white py-2 px-4 border border-gray-300 rounded-xl">
                                {verificationCode}
                            </Text>
                        </Section>
                        <Text className="text-base text-gray-700 mt-2">
                            If you didn’t request this, you can safely ignore
                            this email.
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

export default VerifyEmail;
