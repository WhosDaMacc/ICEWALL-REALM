import React, { useState } from 'react';
import { useRealm } from '../contexts/RealmContext';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { Portal, PowerBolt, People, Info, Warning, CheckCircle } from '@mui/icons-material';
import { PortalEntryAnimation } from './PortalEntryAnimation';

export const PortalDetails: React.FC = () => {
  const { activePortal, setActivePortal } = useRealm();
  const [isEntering, setIsEntering] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  if (!activePortal) {
    return (
      <Card sx={{ m: 2 }}>
        <CardContent>
          <Typography color="text.secondary">
            Select a portal to view details
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const powerLevelColor = (level: number): 'error' | 'warning' | 'success' => {
    if (level >= 80) return 'error';
    if (level >= 50) return 'warning';
    return 'success';
  };

  const handleEnterPortal = async () => {
    try {
      setIsEntering(true);
      setEntryError(null);

      // Check portal requirements
      if (activePortal.powerLevel > 90) {
        setShowRequirements(true);
        return;
      }

      // Show animation
      setShowAnimation(true);
      
      // Simulate portal entry
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // TODO: Implement actual portal entry logic
      console.log('Entering portal:', activePortal.id);
      
      // Reset state after successful entry
      setActivePortal(null);
    } catch (error) {
      setEntryError('Failed to enter portal. Please try again.');
    } finally {
      setIsEntering(false);
      setShowAnimation(false);
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
  };

  const getPortalDescription = (type: string): string => {
    switch (type) {
      case 'ice':
        return 'A realm of eternal winter and crystalline structures';
      case 'fire':
        return 'A volcanic landscape with molten rivers and fiery creatures';
      case 'nature':
        return 'A lush, vibrant world teeming with life and ancient forests';
      case 'shadow':
        return 'A mysterious dimension of darkness and hidden secrets';
      case 'light':
        return 'A radiant realm of pure energy and celestial beings';
      default:
        return 'A mysterious portal to another dimension';
    }
  };

  return (
    <>
      <Card sx={{ m: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Portal />
              <Typography variant="h6">
                {activePortal.name}
              </Typography>
              <Chip
                label={activePortal.type}
                size="small"
                sx={{
                  bgcolor: (theme) => 
                    theme.palette.mode === 'dark' 
                      ? `${activePortal.type}.900` 
                      : `${activePortal.type}.200`
                }}
              />
            </Box>

            <Typography variant="body2" color="text.secondary">
              {getPortalDescription(activePortal.type)}
            </Typography>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Power Level
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PowerBolt />
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={activePortal.powerLevel}
                    color={powerLevelColor(activePortal.powerLevel)}
                  />
                </Box>
                <Typography variant="body2">
                  {activePortal.powerLevel}%
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People />
                <Typography>
                  {activePortal.activeUsers} users
                </Typography>
              </Box>
            </Box>

            {entryError && (
              <Alert severity="error" onClose={() => setEntryError(null)}>
                {entryError}
              </Alert>
            )}

            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleEnterPortal}
              disabled={isEntering}
              startIcon={isEntering ? <CircularProgress size={20} /> : null}
            >
              {isEntering ? 'Entering Portal...' : 'Enter Portal'}
            </Button>

            <Button
              variant="outlined"
              color="info"
              fullWidth
              startIcon={<Info />}
              onClick={() => setShowRequirements(true)}
            >
              View Requirements
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={showRequirements} onClose={() => setShowRequirements(false)}>
        <DialogTitle>Portal Requirements</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              <Typography>Minimum Level: 10</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              <Typography>Required Items: Portal Key</Typography>
            </Box>
            {activePortal.powerLevel > 90 && (
              <Alert severity="warning" icon={<Warning />}>
                This portal requires special authorization due to its high power level.
                Please contact an administrator for access.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRequirements(false)}>Close</Button>
          {activePortal.powerLevel <= 90 && (
            <Button 
              variant="contained" 
              onClick={() => {
                setShowRequirements(false);
                handleEnterPortal();
              }}
            >
              Proceed
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {showAnimation && (
        <PortalEntryAnimation
          portalType={activePortal.type}
          onComplete={handleAnimationComplete}
        />
      )}
    </>
  );
}; 