package com.keith.battlereadyshelf.hiddendefinition;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** One piece of wargear one user does not want offered to them. See {@link HiddenDefinitionService}. */
@Entity
@Table(name = "user_hidden_wargear_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserHiddenWargearDefinitionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "wargear_definition_id", nullable = false)
    private UUID wargearDefinitionId;
}
