package com.keith.battlereadyshelf.factiondefinition;

import com.keith.battlereadyshelf.generated.model.Faction;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FactionDefinitionService {

    private final FactionRepository factionRepository;
    private final FactionDefinitionMapper factionDefinitionMapper;

    /** Lists all factions, for admin tooling such as grouping model definitions by faction. */
    public List<Faction> getAllFactions() {
        return factionRepository.findAll().stream().map(factionDefinitionMapper::toDto).toList();
    }

    public Faction createFaction(Faction faction) {
        return factionDefinitionMapper.toDto(
                factionRepository.save(factionDefinitionMapper.toEntity(faction)));
    }

    public void deleteFaction(UUID factionId) {
        factionRepository.deleteById(factionId);
    }
}
