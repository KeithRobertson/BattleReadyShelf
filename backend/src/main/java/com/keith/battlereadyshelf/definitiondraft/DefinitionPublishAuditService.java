package com.keith.battlereadyshelf.definitiondraft;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.keith.battlereadyshelf.generated.model.DefinitionPublishAudit;

import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;

import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Records and reads the audit trail shared by factions and shared wargear.
 *
 * <p>Kept out of both feature packages because the trail is identical for each: a simple named
 * row, the state either side of a publish, and who accepted it. Duplicating that per feature
 * would mean two tables and two history endpoints describing the same thing.
 */
@Service
@RequiredArgsConstructor
public class DefinitionPublishAuditService {

    private final DefinitionPublishAuditRepository definitionPublishAuditRepository;
    private final ObjectMapper objectMapper;

    /**
     * Records an accepted change. Both states are serialised at the moment of publish so the entry
     * stays readable as a diff even after the definition changes again later.
     */
    public void record(
            Definition definition,
            UUID definitionId,
            UUID publishedBy,
            ProposalOrigin origin,
            Object previousState,
            Object newState) {
        definitionPublishAuditRepository.save(
                DefinitionPublishAuditEntity.builder()
                        .definition(definition)
                        .definitionId(definitionId)
                        .publishedBy(publishedBy)
                        .origin(origin)
                        .previousState(writeJson(previousState))
                        .newState(writeJson(newState))
                        .build());
    }

    public List<DefinitionPublishAudit> getHistory(Definition definition, UUID definitionId) {
        return definitionPublishAuditRepository
                .findAllByDefinitionAndDefinitionIdOrderByPublishedAtDesc(definition, definitionId)
                .stream()
                .map(DefinitionPublishAuditService::toDto)
                .toList();
    }

    private static DefinitionPublishAudit toDto(DefinitionPublishAuditEntity entity) {
        return new DefinitionPublishAudit()
                .id(entity.getId())
                .definitionId(entity.getDefinitionId())
                .publishedBy(entity.getPublishedBy())
                .publishedAt(entity.getPublishedAt().atOffset(ZoneOffset.UTC))
                .origin(toDto(entity.getOrigin()))
                .previousState(entity.getPreviousState())
                .newState(entity.getNewState());
    }

    /** The generated DTO enum shares this one's constant names but not its package. */
    public static com.keith.battlereadyshelf.generated.model.ProposalOrigin toDto(
            ProposalOrigin origin) {
        return com.keith.battlereadyshelf.generated.model.ProposalOrigin.valueOf(origin.name());
    }

    @SneakyThrows
    private String writeJson(Object state) {
        return objectMapper.writeValueAsString(state);
    }
}
