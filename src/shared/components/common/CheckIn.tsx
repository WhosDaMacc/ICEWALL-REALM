import React, { useState, useEffect } from 'react';
import { useReward } from '../contexts/RewardContext';
import { useUser } from '../contexts/UserContext';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { LocationOn, CheckCircle } from '@mui/icons-material';

interface CheckInProps {
  location: {
    latitude: number;
    longitude: number;
  };
}

const CheckIn: React.FC<CheckInProps> = ({ location }) => {
  const { claimReward, availableRewards, refreshRewards } = useReward();
  const { userProfile } = useUser();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);

  const handleCheckIn = async () => {
    try {
      setIsCheckingIn(true);
      setError(null);

      // Check if user has already checked in recently (within 24 hours)
      if (lastCheckIn && (Date.now() - lastCheckIn.getTime()) < 24 * 60 * 60 * 1000) {
        setError('You can only check in once every 24 hours');
        return;
      }

      // Simulate API call to check in
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update last check-in time
      setLastCheckIn(new Date());
      setCheckInSuccess(true);

      // Find and claim available rewards
      const locationRewards = availableRewards.filter(reward => 
        reward.location && 
        calculateDistance(
          location.latitude,
          location.longitude,
          reward.location.latitude,
          reward.location.longitude
        ) <= reward.location.radius
      );

      // Claim all eligible rewards
      locationRewards.forEach(reward => {
        claimReward(reward.id);
      });

      // Refresh available rewards
      refreshRewards();

    } catch (err) {
      setError('Failed to check in. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  useEffect(() => {
    // Reset success message after 3 seconds
    if (checkInSuccess) {
      const timer = setTimeout(() => {
        setCheckInSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [checkInSuccess]);

  if (!userProfile) {
    return (
      <Alert severity="warning">
        Please connect your wallet to check in.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Check In
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <LocationOn color="primary" sx={{ fontSize: 40 }} />
        <Typography variant="body2" color="text.secondary">
          Current Location
        </Typography>
        <Typography variant="body2">
          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {checkInSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Check-in successful! Rewards have been activated.
        </Alert>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleCheckIn}
        disabled={isCheckingIn || checkInSuccess}
        startIcon={isCheckingIn ? <CircularProgress size={20} /> : <CheckCircle />}
        sx={{ width: '100%' }}
      >
        {isCheckingIn ? 'Checking In...' : 'Check In'}
      </Button>

      {lastCheckIn && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Last check-in: {lastCheckIn.toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};

export default CheckIn; 