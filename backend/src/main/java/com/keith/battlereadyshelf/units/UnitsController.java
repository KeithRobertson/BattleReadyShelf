package com.keith.battlereadyshelf.units;

import com.keith.battlereadyshelf.generated.api.UnitsApi;
import com.keith.battlereadyshelf.generated.model.UnitDefinition;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@AllArgsConstructor
public class UnitsController implements UnitsApi {
    private final UnitsService unitsService;
    @Override
    public ResponseEntity<List<UnitDefinition>> getUnits() {
        unitsService.getUnits();
        return ResponseEntity.notFound().build();
    }
}
