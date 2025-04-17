# Icewall Realm

A dynamic battle system featuring Navitars with unique abilities, tag team combinations, and immersive effects.

## Features

- **Navitar Battle System**: Turn-based combat with unique Navitar types and abilities
- **Tag Team Battles**: Combine two Navitars for powerful fusion attacks
- **Dynamic Effects**: Visual and sound effects for battles
- **Combo System**: Build up combo meter for special moves
- **Type Advantages**: Strategic element based on Navitar types

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/icewall-realm.git
cd icewall-realm
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

## Project Structure

```
src/
├── components/         # React components
│   ├── BattleEffects.tsx
│   ├── BattleSoundEffects.tsx
│   ├── NavitarBattle.tsx
│   └── TagTeamBattle.tsx
├── contexts/          # React contexts
│   └── BattleContext.tsx
├── docs/             # Documentation
│   └── NavitarDatabase.md
└── types/            # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.