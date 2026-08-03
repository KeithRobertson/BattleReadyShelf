package com.keith.battlereadyshelf.storage;

import org.springframework.stereotype.Component;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.time.Duration;

@Component
public class PresignedUrlService {
    private static final Duration UPLOAD_URL_TTL = Duration.ofMinutes(15);
    private static final Duration DOWNLOAD_URL_TTL = Duration.ofMinutes(15);

    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    private final StorageProperties storageProperties;

    public PresignedUrlService(
            S3Presigner s3Presigner, S3Client s3Client, StorageProperties storageProperties) {
        this.s3Presigner = s3Presigner;
        this.s3Client = s3Client;
        this.storageProperties = storageProperties;
    }

    public URI presignUpload(String key, String contentType) {
        var presignRequest =
                PutObjectPresignRequest.builder()
                        .signatureDuration(UPLOAD_URL_TTL)
                        .putObjectRequest(
                                p ->
                                        p.bucket(storageProperties.getBucket())
                                                .key(key)
                                                .contentType(contentType))
                        .build();

        return URI.create(s3Presigner.presignPutObject(presignRequest).url().toString());
    }

    public URI presignDownload(String key) {
        var presignRequest =
                GetObjectPresignRequest.builder()
                        .signatureDuration(DOWNLOAD_URL_TTL)
                        .getObjectRequest(g -> g.bucket(storageProperties.getBucket()).key(key))
                        .build();

        return URI.create(s3Presigner.presignGetObject(presignRequest).url().toString());
    }

    public void deleteObject(String key) {
        s3Client.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(storageProperties.getBucket())
                        .key(key)
                        .build());
    }
}
