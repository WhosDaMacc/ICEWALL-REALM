import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Button, Card, CardContent, CardMedia, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert } from '@mui/material';
import { useWeb3 } from '../contexts/Web3Context';
import { Navitar } from '../data/navitars';

interface Item {
  id: string;
  name: string;
  type: 'consumable' | 'equipment' | 'collectible' | 'nft' | 'power_up' | 'shield' | 'special_attack';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  imageUrl: string;
  effects: {
    health?: number;
    power?: number;
    defense?: number;
    speed?: number;
    shield?: {
      amount: number;
      type: 'physical' | 'magical' | 'elemental' | 'ultimate';
      resistance?: number;
    };
    specialAttack?: {
      name: string;
      damage: number;
      cooldown: number;
      effect: string;
      type: 'single' | 'area' | 'chain' | 'ultimate';
      visualEffect: string;
    };
  };
  price?: number;
  isNFT?: boolean;
  tokenId?: string;
  duration?: number;
  combination?: {
    items: string[];
    result: string;
  };
}

interface ActiveEffect {
  power?: number;
  shield?: number;
  attack?: string;
  type?: string;
  expires?: Date;
  cooldown?: Date;
}

interface Inventory {
  items: Item[];
  capacity: number;
  upgradeLevel: number;
  activeShields: { [navitarId: string]: { shield: number; type: string; expires: Date } };
  activePowerUps: { [navitarId: string]: { power: number; expires: Date } };
  specialAttacks: { [navitarId: string]: { attack: string; cooldown: Date } };
  tradeOffers: TradeOffer[];
}

interface TradeOffer {
  id: string;
  from: string;
  items: Item[];
  requestedItems: Item[];
  status: 'pending' | 'accepted' | 'rejected';
}

const ItemSystem: React.FC = () => {
  const [inventory, setInventory] = useState<Inventory>({
    items: [],
    capacity: 20,
    upgradeLevel: 1,
    activeShields: {},
    activePowerUps: {},
    specialAttacks: {},
    tradeOffers: [],
  });
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [selectedNavitar, setSelectedNavitar] = useState<Navitar | null>(null);
  const [showVisualEffect, setShowVisualEffect] = useState(false);
  const [activeEffect, setActiveEffect] = useState<string>('');
  const { account } = useWeb3();

  // Enhanced items data
  const items: Item[] = [
    {
      id: 'power_boost',
      name: 'Power Boost',
      type: 'power_up',
      rarity: 'rare',
      description: 'Temporarily increases Navitar power by 50%',
      imageUrl: '/items/power_boost.png',
      effects: { power: 50 },
      duration: 300,
    },
    {
      id: 'elemental_shield',
      name: 'Elemental Shield',
      type: 'shield',
      rarity: 'epic',
      description: 'Protects against elemental attacks with 75% resistance',
      imageUrl: '/items/elemental_shield.png',
      effects: {
        shield: {
          amount: 200,
          type: 'elemental',
          resistance: 75,
        },
      },
      duration: 600,
    },
    {
      id: 'thunder_strike',
      name: 'Thunder Strike',
      type: 'special_attack',
      rarity: 'legendary',
      description: 'Unleashes a powerful lightning attack that chains between enemies',
      imageUrl: '/items/thunder_strike.png',
      effects: {
        specialAttack: {
          name: 'Thunder Strike',
          damage: 150,
          cooldown: 300,
          effect: 'Stuns target for 2 seconds and chains to 3 nearby enemies',
          type: 'chain',
          visualEffect: 'lightning_chain',
        },
      },
    },
    {
      id: 'ultimate_shield',
      name: 'Ultimate Shield',
      type: 'shield',
      rarity: 'legendary',
      description: 'Provides complete immunity for a short duration',
      imageUrl: '/items/ultimate_shield.png',
      effects: {
        shield: {
          amount: 9999,
          type: 'ultimate',
          resistance: 100,
        },
      },
      duration: 30,
    },
    {
      id: 'meteor_strike',
      name: 'Meteor Strike',
      type: 'special_attack',
      rarity: 'legendary',
      description: 'Calls down a massive meteor that deals area damage',
      imageUrl: '/items/meteor_strike.png',
      effects: {
        specialAttack: {
          name: 'Meteor Strike',
          damage: 300,
          cooldown: 600,
          effect: 'Deals massive damage in a large area and burns enemies',
          type: 'area',
          visualEffect: 'meteor_impact',
        },
      },
    },
  ];

  const handleItemUse = (item: Item, navitar: Navitar) => {
    if (!navitar) return;

    // Show visual effect
    if (item.effects.specialAttack?.visualEffect) {
      setActiveEffect(item.effects.specialAttack.visualEffect);
      setShowVisualEffect(true);
      setTimeout(() => setShowVisualEffect(false), 2000);
    }

    const newInventory = { ...inventory };

    switch (item.type) {
      case 'power_up':
        if (item.effects.power) {
          newInventory.activePowerUps = {
            ...newInventory.activePowerUps,
            [navitar.id]: {
              power: item.effects.power,
              expires: new Date(Date.now() + (item.duration! * 1000)),
            },
          };
        }
        break;

      case 'shield':
        if (item.effects.shield) {
          newInventory.activeShields = {
            ...newInventory.activeShields,
            [navitar.id]: {
              shield: item.effects.shield.amount,
              type: item.effects.shield.type,
              expires: new Date(Date.now() + (item.duration! * 1000)),
            },
          };
        }
        break;

      case 'special_attack':
        if (item.effects.specialAttack) {
          newInventory.specialAttacks = {
            ...newInventory.specialAttacks,
            [navitar.id]: {
              attack: item.effects.specialAttack.name,
              cooldown: new Date(Date.now() + (item.effects.specialAttack.cooldown * 1000)),
            },
          };
        }
        break;
    }

    // Remove item from inventory
    newInventory.items = newInventory.items.filter(i => i.id !== item.id);
    setInventory(newInventory);
  };

  const handleItemCombination = (items: Item[]) => {
    const combination = items.find(item => item.combination);
    if (combination?.combination) {
      const resultItem = items.find(item => item.id === combination.combination?.result);
      if (resultItem) {
        setInventory(prev => ({
          ...prev,
          items: [
            ...prev.items.filter(i => !items.includes(i)),
            resultItem,
          ],
        }));
      }
    }
  };

  const createTradeOffer = (items: Item[], requestedItems: Item[]) => {
    const newOffer: TradeOffer = {
      id: Date.now().toString(),
      from: account || '',
      items,
      requestedItems,
      status: 'pending',
    };
    setInventory(prev => ({
      ...prev,
      tradeOffers: [...prev.tradeOffers, newOffer],
    }));
  };

  const acceptTradeOffer = (offerId: string) => {
    setInventory(prev => ({
      ...prev,
      tradeOffers: prev.tradeOffers.map(offer => 
        offer.id === offerId ? { ...offer, status: 'accepted' } : offer
      ),
    }));
  };

  const getActiveEffects = (navitarId: string): Record<string, ActiveEffect | null> => {
    const powerUp = inventory.activePowerUps[navitarId];
    const shield = inventory.activeShields[navitarId];
    const specialAttack = inventory.specialAttacks[navitarId];

    return {
      powerUp: powerUp && new Date() < powerUp.expires ? { power: powerUp.power, expires: powerUp.expires } : null,
      shield: shield && new Date() < shield.expires ? { shield: shield.shield, type: shield.type, expires: shield.expires } : null,
      specialAttack: specialAttack && new Date() < specialAttack.cooldown ? { attack: specialAttack.attack, cooldown: specialAttack.cooldown } : null,
    };
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Item System
      </Typography>

      <Grid container spacing={2}>
        <Grid xs={12} md={8}>
          <Typography variant="h6" gutterBottom>
            Inventory ({inventory.items.length}/{inventory.capacity})
          </Typography>
          <Grid container spacing={2}>
            {inventory.items.map((item) => (
              <Grid xs={12} sm={6} md={4} key={item.id}>
                <Card 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedItem(item);
                    setShowItemDialog(true);
                  }}
                >
                  <CardMedia
                    component="img"
                    height="140"
                    image={item.imageUrl}
                    alt={item.name}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h6" component="div">
                      {item.name}
                    </Typography>
                    <Chip 
                      label={item.rarity} 
                      color={
                        item.rarity === 'legendary' ? 'error' :
                        item.rarity === 'epic' ? 'secondary' :
                        item.rarity === 'rare' ? 'primary' : 'default'
                      }
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                    {item.duration && (
                      <Typography variant="caption" color="text.secondary">
                        Duration: {item.duration} seconds
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid xs={12} md={4}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Active Effects
            </Typography>
            {selectedNavitar && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1">
                    {selectedNavitar.name}
                  </Typography>
                  {Object.entries(getActiveEffects(selectedNavitar.id)).map(([type, effect]) => {
                    if (!effect) return null;
                    return (
                      <Chip
                        key={type}
                        label={`${type}: ${effect.power || effect.shield || effect.attack}`}
                        color="primary"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Trade Offers
            </Typography>
            {inventory.tradeOffers.map((offer) => (
              <Card key={offer.id} sx={{ mb: 1 }}>
                <CardContent>
                  <Typography variant="subtitle1">
                    From: {offer.from}
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={() => acceptTradeOffer(offer.id)}
                    disabled={offer.status !== 'pending'}
                  >
                    Accept Trade
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Grid>
      </Grid>

      {showVisualEffect && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {/* Visual effect component would go here */}
        </Box>
      )}

      <Dialog 
        open={showItemDialog} 
        onClose={() => setShowItemDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedItem && (
          <>
            <DialogTitle>{selectedItem.name}</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <img 
                  src={selectedItem.imageUrl} 
                  alt={selectedItem.name}
                  style={{ width: '100%', height: 'auto' }}
                />
              </Box>
              <Typography variant="body1" gutterBottom>
                {selectedItem.description}
              </Typography>
              {selectedItem.effects && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1">Effects:</Typography>
                  {Object.entries(selectedItem.effects).map(([key, value]) => {
                    if (key === 'specialAttack') {
                      const attack = value as any;
                      return (
                        <Box key={key} sx={{ mt: 1 }}>
                          <Typography variant="subtitle2">{attack.name}</Typography>
                          <Chip label={`Damage: ${attack.damage}`} sx={{ mr: 1 }} />
                          <Chip label={`Cooldown: ${attack.cooldown}s`} sx={{ mr: 1 }} />
                          <Chip label={`Effect: ${attack.effect}`} />
                          <Chip label={`Type: ${attack.type}`} sx={{ mt: 1 }} />
                        </Box>
                      );
                    }
                    if (key === 'shield') {
                      const shield = value as any;
                      return (
                        <Box key={key} sx={{ mt: 1 }}>
                          <Typography variant="subtitle2">Shield</Typography>
                          <Chip label={`Amount: ${shield.amount}`} sx={{ mr: 1 }} />
                          <Chip label={`Type: ${shield.type}`} sx={{ mr: 1 }} />
                          {shield.resistance && (
                            <Chip label={`Resistance: ${shield.resistance}%`} />
                          )}
                        </Box>
                      );
                    }
                    return (
                      <Chip 
                        key={key}
                        label={`${key}: ${value}`}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    );
                  })}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button 
                variant="contained" 
                onClick={() => {
                  if (selectedNavitar) {
                    handleItemUse(selectedItem, selectedNavitar);
                  }
                  setShowItemDialog(false);
                }}
                disabled={!selectedNavitar}
              >
                Use Item
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setShowTradeDialog(true)}
              >
                Trade Item
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ItemSystem; 