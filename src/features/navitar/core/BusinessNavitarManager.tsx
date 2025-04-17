import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import { useBusiness } from '../contexts/BusinessContext';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';

interface BusinessNavitarManagerProps {
  businessId: string;
}

const BusinessNavitarManager: React.FC<BusinessNavitarManagerProps> = ({ businessId }) => {
  const { businesses, updateBusinessNavitar } = useBusiness();
  const { launchBusinessNavitar } = useNavitarFightClub();
  const [isCreateNavitarOpen, setIsCreateNavitarOpen] = useState(false);
  const [navitarName, setNavitarName] = useState('');
  const [navitarSkills, setNavitarSkills] = useState('');
  const [navitarLevel, setNavitarLevel] = useState(1);

  const business = businesses.find(b => b.id === businessId);

  const handleCreateNavitar = () => {
    if (navitarName && navitarSkills) {
      const skills = navitarSkills.split(',').map(skill => skill.trim());
      const stats = {
        strength: 10 + Math.floor(navitarLevel * 1.5),
        defense: 10 + Math.floor(navitarLevel * 1.2),
        speed: 10 + Math.floor(navitarLevel * 1.3),
        stamina: 10 + Math.floor(navitarLevel * 1.1),
      };

      launchBusinessNavitar(businessId, {
        name: navitarName,
        level: navitarLevel,
        skills,
        stats,
      });

      setIsCreateNavitarOpen(false);
      setNavitarName('');
      setNavitarSkills('');
      setNavitarLevel(1);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {business?.navitar ? (
        <Card>
          <CardContent>
            <Typography variant="h6">Business Navitar</Typography>
            <Typography>Name: {business.navitar.name}</Typography>
            <Typography>Level: {business.navitar.level}</Typography>
            <Typography>Skills: {business.navitar.skills.join(', ')}</Typography>
            <Box sx={{ mt: 2 }}>
              <Typography>Stats:</Typography>
              <Typography>Strength: {business.navitar.stats.strength}</Typography>
              <Typography>Defense: {business.navitar.stats.defense}</Typography>
              <Typography>Speed: {business.navitar.stats.speed}</Typography>
              <Typography>Stamina: {business.navitar.stats.stamina}</Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={() => setIsCreateNavitarOpen(true)}
        >
          Create Business Navitar
        </Button>
      )}

      <Dialog open={isCreateNavitarOpen} onClose={() => setIsCreateNavitarOpen(false)}>
        <DialogTitle>Create Business Navitar</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Navitar Name"
            fullWidth
            value={navitarName}
            onChange={(e) => setNavitarName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Skills (comma-separated)"
            fullWidth
            value={navitarSkills}
            onChange={(e) => setNavitarSkills(e.target.value)}
            helperText="Enter skills separated by commas"
          />
          <TextField
            margin="dense"
            label="Level"
            type="number"
            fullWidth
            value={navitarLevel}
            onChange={(e) => setNavitarLevel(Number(e.target.value))}
            inputProps={{ min: 1, max: 100 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateNavitarOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateNavitar} color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusinessNavitarManager; 