WITH plague_marine AS (SELECT id
                       FROM model_definitions
                       WHERE name = 'Plague Marine'),
     left_arm AS (SELECT slot.id
                  FROM attachment_slots slot
                           JOIN plague_marine md ON md.id = slot.model_definition_id
                  WHERE slot.name = 'Left Arm'),
     right_arm AS (SELECT slot.id
                   FROM attachment_slots slot
                            JOIN plague_marine md ON md.id = slot.model_definition_id
                   WHERE slot.name = 'Right Arm'),
     new_left_arm_options AS (
         INSERT INTO wargear_options (model_definition_id, name, is_default)
             SELECT plague_marine.id, option_name, FALSE
             FROM plague_marine,
                  (VALUES ('Bolt Pistol'),
                          ('Plasma Gun'),
                          ('Plasma Pistol'),
                          ('Blight Launcher'),
                          ('Plague Spewer'),
                          ('Meltagun'),
                          ('Plague Belcher'),
                          ('Bubotic Weapons'),
                          ('Boltgun & Icon of Despair')) AS options (option_name)
             RETURNING id),
     new_right_arm_options AS (
         INSERT INTO wargear_options (model_definition_id, name, is_default)
             SELECT plague_marine.id, option_name, FALSE
             FROM plague_marine,
                  (VALUES ('Bubotic Weapons'),
                          ('Power Fist')) AS options (option_name)
             RETURNING id)
INSERT
INTO wargear_option_slots (wargear_option_id, attachment_slot_id)
SELECT id, (SELECT id FROM left_arm)
FROM new_left_arm_options
UNION ALL
SELECT id, (SELECT id FROM right_arm)
FROM new_right_arm_options;
