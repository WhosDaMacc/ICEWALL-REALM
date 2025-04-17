const fs = require('fs');
const path = require('path');

const moveFiles = {
  // Battle System
  'src/components/BattleSystem.tsx': 'src/features/battle/core/BattleSystem.tsx',
  'src/components/BattleEffects.tsx': 'src/features/battle/effects/BattleEffects.tsx',
  'src/components/BattleSoundEffects.tsx': 'src/features/battle/effects/BattleSoundEffects.tsx',
  'src/components/BattleInterface.tsx': 'src/features/battle/ui/BattleInterface.tsx',
  'src/components/BattleStatus.tsx': 'src/features/battle/ui/BattleStatus.tsx',
  'src/components/BattleMoves.tsx': 'src/features/battle/ui/BattleMoves.tsx',
  'src/components/BattleAnimation.tsx': 'src/features/battle/animations/BattleAnimation.tsx',
  'src/components/BattleAnimations.tsx': 'src/features/battle/animations/BattleAnimations.tsx',
  'src/components/BattleEnvironment.tsx': 'src/features/battle/effects/BattleEnvironment.tsx',
  'src/components/EnhancedBattle.tsx': 'src/features/battle/core/EnhancedBattle.tsx',
  'src/components/EpicBattle.tsx': 'src/features/battle/core/EpicBattle.tsx',
  'src/components/EpicBattleEffects.tsx': 'src/features/battle/effects/EpicBattleEffects.tsx',
  'src/components/TagTeamBattle.tsx': 'src/features/battle/core/TagTeamBattle.tsx',
  'src/components/CombatAbilities.tsx': 'src/features/battle/core/CombatAbilities.tsx',
  'src/components/VictoryScreen.tsx': 'src/features/battle/ui/VictoryScreen.tsx',

  // Navitar System
  'src/components/NavitarBattle.tsx': 'src/features/navitar/core/NavitarBattle.tsx',
  'src/components/NavitarCharacter.tsx': 'src/features/navitar/core/NavitarCharacter.tsx',
  'src/components/NavitarDisplay.tsx': 'src/features/navitar/display/NavitarDisplay.tsx',
  'src/components/NavitarStats.tsx': 'src/features/navitar/stats/NavitarStats.tsx',
  'src/components/NavitarPersonality.tsx': 'src/features/navitar/personality/NavitarPersonality.tsx',
  'src/components/NavitarDesign.tsx': 'src/features/navitar/display/NavitarDesign.tsx',
  'src/components/NavitarShowcase.tsx': 'src/features/navitar/display/NavitarShowcase.tsx',
  'src/components/TierProgression.tsx': 'src/features/navitar/stats/TierProgression.tsx',
  'src/components/BusinessNavitarManager.tsx': 'src/features/navitar/core/BusinessNavitarManager.tsx',

  // Map System
  'src/components/NavitarMap.tsx': 'src/features/map/core/NavitarMap.tsx',
  'src/components/RealmMap.tsx': 'src/features/map/core/RealmMap.tsx',
  'src/components/PortalDetails.tsx': 'src/features/map/portals/PortalDetails.tsx',
  'src/components/PortalEntryAnimation.tsx': 'src/features/map/portals/PortalEntryAnimation.tsx',

  // Shared Components
  'src/components/Navbar.tsx': 'src/shared/components/layout/Navbar.tsx',
  'src/components/Footer.tsx': 'src/shared/components/layout/Footer.tsx',
  'src/components/Home.tsx': 'src/shared/components/layout/Home.tsx',
  'src/components/App.tsx': 'src/shared/components/layout/App.tsx',
  'src/components/ItemSystem.tsx': 'src/shared/components/common/ItemSystem.tsx',
  'src/components/CheckIn.tsx': 'src/shared/components/common/CheckIn.tsx',
  'src/components/NetworkingStatus.tsx': 'src/shared/components/common/NetworkingStatus.tsx',
  'src/components/AIAvatar.tsx': 'src/shared/components/common/AIAvatar.tsx',
  'src/components/ARView.tsx': 'src/shared/components/common/ARView.tsx'
};

// Create directories if they don't exist
Object.values(moveFiles).forEach(dest => {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Move files
Object.entries(moveFiles).forEach(([src, dest]) => {
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`Moved ${src} to ${dest}`);
  } else {
    console.log(`Source file not found: ${src}`);
  }
}); 