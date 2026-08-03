package com.keith.battlereadyshelf.storage;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.URI;

/**
 * Configures an {@link S3Presigner} pointed at Cloudflare R2's S3-compatible API, used to generate
 * short-lived presigned upload/download URLs. R2 buckets are region-less, so "auto" is used as the
 * region per Cloudflare's documentation. Also configures a plain {@link S3Client} for server-side
 * operations (e.g. deleting objects) that don't need to be presigned for a browser to call
 * directly.
 */
@Configuration
public class R2Configuration {
    @Bean
    S3Presigner s3Presigner(
            @Value("${app.storage.r2.endpoint}") String endpoint,
            @Value("${app.storage.r2.access-key-id}") String accessKeyId,
            @Value("${app.storage.r2.secret-access-key}") String secretAccessKey) {
        return S3Presigner.builder()
                .region(Region.of("auto"))
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .build();
    }

    @Bean
    S3Client s3Client(
            @Value("${app.storage.r2.endpoint}") String endpoint,
            @Value("${app.storage.r2.access-key-id}") String accessKeyId,
            @Value("${app.storage.r2.secret-access-key}") String secretAccessKey) {
        return S3Client.builder()
                .region(Region.of("auto"))
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .build();
    }
}
