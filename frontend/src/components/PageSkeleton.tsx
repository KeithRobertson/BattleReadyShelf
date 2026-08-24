import {Skeleton, Stack} from "@mantine/core";

export default function PageSkeleton() {
    return (
        <Stack p="md" gap="lg">
            <Skeleton height={32} width="40%" radius="md" />
            <Skeleton height={20} width="60%" radius="md" />
            <Skeleton height={400} radius="md" />
        </Stack>
    );
}