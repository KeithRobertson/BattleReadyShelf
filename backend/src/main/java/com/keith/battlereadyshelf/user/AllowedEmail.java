package com.keith.battlereadyshelf.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "allowed_emails")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllowedEmail {
    @Id
    @Column(nullable = false)
    private String email;

    @CreationTimestamp
    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;
}
