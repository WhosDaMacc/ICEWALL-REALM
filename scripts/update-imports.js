const fs = require('fs');
const path = require('path');

const importUpdates = {
  // Battle System
  'BattleSystem': '@features/battle/core/BattleSystem',
  'BattleEffects': '@features/battle/effects/BattleEffects',
  'BattleSoundEffects': '@features/battle/effects/BattleSoundEffects',
  'BattleInterface': '@features/battle/ui/BattleInterface',
  'BattleStatus': '@features/battle/ui/BattleStatus',
  'BattleMoves': '@features/battle/ui/BattleMoves',
  'BattleAnimation': '@features/battle/animations/BattleAnimation',
  'BattleAnimations': '@features/battle/animations/BattleAnimations',
  'BattleEnvironment': '@features/battle/effects/BattleEnvironment',
  'EnhancedBattle': '@features/battle/core/EnhancedBattle',
  'EpicBattle': '@features/battle/core/EpicBattle',
  'EpicBattleEffects': '@features/battle/effects/EpicBattleEffects',
  'TagTeamBattle': '@features/battle/core/TagTeamBattle',
  'CombatAbilities': '@features/battle/core/CombatAbilities',
  'VictoryScreen': '@features/battle/ui/VictoryScreen',

  // Navitar System
  'NavitarBattle': '@features/navitar/core/NavitarBattle',
  'NavitarCharacter': '@features/navitar/core/NavitarCharacter',
  'NavitarDisplay': '@features/navitar/display/NavitarDisplay',
  'NavitarStats': '@features/navitar/stats/NavitarStats',
  'NavitarPersonality': '@features/navitar/personality/NavitarPersonality',
  'NavitarDesign': '@features/navitar/display/NavitarDesign',
  'NavitarShowcase': '@features/navitar/display/NavitarShowcase',
  'TierProgression': '@features/navitar/stats/TierProgression',
  'BusinessNavitarManager': '@features/navitar/core/BusinessNavitarManager',

  // Map System
  'NavitarMap': '@features/map/core/NavitarMap',
  'RealmMap': '@features/map/core/RealmMap',
  'PortalDetails': '@features/map/portals/PortalDetails',
  'PortalEntryAnimation': '@features/map/portals/PortalEntryAnimation',

  // Shared Components
  'Navbar': '@shared/components/layout/Navbar',
  'Footer': '@shared/components/layout/Footer',
  'Home': '@shared/components/layout/Home',
  'App': '@shared/components/layout/App',
  'ItemSystem': '@shared/components/common/ItemSystem',
  'CheckIn': '@shared/components/common/CheckIn',
  'NetworkingStatus': '@shared/components/common/NetworkingStatus',
  'AIAvatar': '@shared/components/common/AIAvatar',
  'ARView': '@shared/components/common/ARView'
};

// Update tsconfig.json to include path aliases
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
let tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

tsconfig.compilerOptions.paths = {
  '@features/*': ['src/features/*'],
  '@shared/*': ['src/shared/*']
};

fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

// Function to update imports in a file
function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  Object.entries(importUpdates).forEach(([oldImport, newImport]) => {
    const importRegex = new RegExp(`import\\s+{[^}]*\\b${oldImport}\\b[^}]*}\\s+from\\s+['"][^'"]+['"]`, 'g');
    content = content.replace(importRegex, match => {
      return match.replace(/from\s+['"][^'"]+['"]/, `from '${newImport}'`);
    });
  });

  fs.writeFileSync(filePath, content);
}

// Update imports in all TypeScript files
function updateAllImports(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      updateAllImports(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      updateImports(filePath);
    }
  });
}

// Start updating imports from src directory
updateAllImports(path.join(process.cwd(), 'src')); 