// Attack editor — the user navitar's 5-slot move list, one compact row
// per slot. A row is either one of the element's presets (power locked
// to the preset's base) or Custom (a typed name, power 5–25). The damage
// shown is the scaled power at the navitar's current level, so the
// trainer sees what the move actually hits for today — not just the
// Lv 1 base. Controlled: every change calls onChange with the full
// 5-slot list; the parent decides when to save it.
import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  ATTACK_PRESETS,
  CUSTOM_POWER_MAX,
  CUSTOM_POWER_MIN,
  attackPowerAtLevel,
  clampAttackPower,
  type Element,
  type NavitarAttack,
} from '../utils/attacks';

interface AttackEditorProps {
  attacks: NavitarAttack[];
  element: Element;
  level: number;
  onChange: (attacks: NavitarAttack[]) => void;
}

const CUSTOM_VALUE = '__custom__';

const AttackEditor: React.FC<AttackEditorProps> = ({ attacks, element, level, onChange }) => {
  const presets = ATTACK_PRESETS[element] ?? ATTACK_PRESETS.ice;
  // The power field is a number input the trainer can clear mid-type,
  // so its raw text lives here, keyed by the row's identity (index +
  // name + preset flag). The key changes when the row becomes a
  // different move, which drops any stale draft; typing a power keeps
  // the key stable, so the draft survives re-renders.
  const [powerDrafts, setPowerDrafts] = useState<Record<string, string>>({});

  const updateSlot = (index: number, next: NavitarAttack) => {
    onChange(attacks.map((attack, i) => (i === index ? next : attack)));
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Base power is Lv 1 — damage grows with level, so the number on the right is what each move
        hits for at Lv {level}.
      </Typography>
      {attacks.map((attack, index) => {
        const rowKey = `${index}:${attack.name}:${attack.preset}`;
        // A preset row only counts as one when its name is actually one
        // of this element's presets — a stored preset name from another
        // element falls back to the Custom fields instead of a blank
        // select.
        const preset = presets.find(p => p.name === attack.name);
        const isPresetRow = attack.preset && preset !== undefined;
        const selectValue = isPresetRow ? attack.name : CUSTOM_VALUE;
        return (
          <Box
            key={index}
            sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 16, textAlign: 'center' }}
            >
              {index + 1}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 190, flexGrow: 1 }}>
              <InputLabel id={`attack-${index}-label`}>Attack {index + 1}</InputLabel>
              <Select
                labelId={`attack-${index}-label`}
                label={`Attack ${index + 1}`}
                value={selectValue}
                onChange={e => {
                  const value = e.target.value;
                  if (value === CUSTOM_VALUE) {
                    updateSlot(index, {
                      name: attack.name,
                      power: clampAttackPower(attack.power),
                      preset: false,
                    });
                    return;
                  }
                  const picked = presets.find(p => p.name === value);
                  if (picked) {
                    updateSlot(index, { name: picked.name, power: picked.power, preset: true });
                  }
                }}
              >
                {presets.map(p => (
                  <MenuItem key={p.name} value={p.name}>
                    {p.name} — {p.power} base
                  </MenuItem>
                ))}
                <MenuItem value={CUSTOM_VALUE}>Custom…</MenuItem>
              </Select>
            </FormControl>
            {!isPresetRow && (
              <>
                <TextField
                  size="small"
                  label="Custom name"
                  value={attack.name}
                  inputProps={{ maxLength: 40 }}
                  onChange={e =>
                    updateSlot(index, { name: e.target.value, power: attack.power, preset: false })
                  }
                  sx={{ minWidth: 160, flexGrow: 1 }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Power"
                  value={powerDrafts[rowKey] ?? String(attack.power)}
                  inputProps={{ min: CUSTOM_POWER_MIN, max: CUSTOM_POWER_MAX, step: 1 }}
                  onChange={e => {
                    const raw = e.target.value;
                    setPowerDrafts(prev => ({ ...prev, [rowKey]: raw }));
                    const parsed = parseInt(raw, 10);
                    if (!Number.isNaN(parsed)) {
                      updateSlot(index, {
                        name: attack.name,
                        power: clampAttackPower(parsed),
                        preset: false,
                      });
                    }
                  }}
                  onBlur={e => {
                    // Cleared or unparseable: drop the draft so the
                    // field shows the saved power again.
                    if (
                      e.target.value.trim() === '' ||
                      Number.isNaN(parseInt(e.target.value, 10))
                    ) {
                      setPowerDrafts(prev => {
                        const next = { ...prev };
                        delete next[rowKey];
                        return next;
                      });
                    }
                  }}
                  sx={{ width: 96 }}
                />
              </>
            )}
            <Typography variant="body2" sx={{ minWidth: 96 }}>
              Lv {level}: {attackPowerAtLevel(attack.power, level)} dmg
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default AttackEditor;
