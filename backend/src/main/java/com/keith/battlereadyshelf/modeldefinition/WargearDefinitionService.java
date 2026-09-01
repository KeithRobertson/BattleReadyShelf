package com.keith.battlereadyshelf.modeldefinition;

import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.WargearDefinition;
import com.keith.battlereadyshelf.generated.model.WargearDefinitionDraft;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Administration of the shared wargear catalogue. Because a definition is referenced rather than
 * copied, renaming one here immediately renames it on every model definition that uses it, which
 * is the whole point of storing wargear this way.
 *
 * <p>That fan-out is also why imports do not rename directly: they stage a {@link
 * WargearDefinitionDraftEntity} that an admin accepts or rejects here.
 */
@Service
@RequiredArgsConstructor
public class WargearDefinitionService {
    private final WargearDefinitionRepository wargearDefinitionRepository;
    private final WargearDefinitionDraftRepository wargearDefinitionDraftRepository;
    private final WargearOptionRepository wargearOptionRepository;

    public List<WargearDefinition> getAllWargearDefinitions() {
        Map<UUID, Long> usageCounts = usageCounts();

        return wargearDefinitionRepository.findAll().stream()
                .sorted(Comparator.comparing(WargearDefinitionEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(definition -> toDto(definition, usageCounts.getOrDefault(definition.getId(), 0L)))
                .toList();
    }

    public List<WargearDefinitionDraft> getAllWargearDefinitionDrafts() {
        Map<UUID, Long> usageCounts = usageCounts();

        return wargearDefinitionDraftRepository.findAllByOrderByProposedNameAsc().stream()
                .map(
                        draft ->
                                toDraftDto(
                                        draft,
                                        usageCounts.getOrDefault(
                                                draft.getWargearDefinition().getId(), 0L)))
                .toList();
    }

    @Transactional
    public WargearDefinition renameWargearDefinition(UUID wargearDefinitionId, String name) {
        var definition =
                wargearDefinitionRepository
                        .findById(wargearDefinitionId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Wargear definition not found: " + wargearDefinitionId));
        definition.setName(name);
        var saved = wargearDefinitionRepository.save(definition);

        // A pending proposal is moot once an admin has set the name by hand, whether or not they
        // happened to type the proposed spelling.
        wargearDefinitionDraftRepository
                .findAllByDefinitionId(List.of(saved.getId()))
                .values()
                .forEach(wargearDefinitionDraftRepository::delete);

        return toDto(saved, wargearOptionRepository.countByWargearDefinitionId(saved.getId()));
    }

    /** Accepts a proposed rename, applying it to the definition and every model that uses it. */
    @Transactional
    public WargearDefinition publishWargearDefinitionDraft(UUID draftId) {
        var draft =
                wargearDefinitionDraftRepository
                        .findById(draftId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Wargear definition draft not found: " + draftId));

        var definition = draft.getWargearDefinition();
        definition.setName(draft.getProposedName());
        var saved = wargearDefinitionRepository.save(definition);
        wargearDefinitionDraftRepository.delete(draft);

        return toDto(saved, wargearOptionRepository.countByWargearDefinitionId(saved.getId()));
    }

    /** Rejects a proposed rename, keeping the stored name. A later import may propose it again. */
    @Transactional
    public void discardWargearDefinitionDraft(UUID draftId) {
        var draft =
                wargearDefinitionDraftRepository
                        .findById(draftId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Wargear definition draft not found: " + draftId));
        wargearDefinitionDraftRepository.delete(draft);
    }

    private Map<UUID, Long> usageCounts() {
        return wargearOptionRepository.countUsagesByWargearDefinition().stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
    }

    private WargearDefinition toDto(WargearDefinitionEntity entity, long usageCount) {
        return new WargearDefinition(entity.getName())
                .id(entity.getId())
                .externalId(entity.getExternalId())
                .usageCount(Math.toIntExact(usageCount));
    }

    private WargearDefinitionDraft toDraftDto(WargearDefinitionDraftEntity entity, long usageCount) {
        var definition = entity.getWargearDefinition();
        return new WargearDefinitionDraft(definition.getName(), entity.getProposedName())
                .id(entity.getId())
                .wargearDefinitionId(definition.getId())
                .externalId(definition.getExternalId())
                .usageCount(Math.toIntExact(usageCount))
                .createdAt(entity.getCreatedAt().atOffset(ZoneOffset.UTC));
    }
}
