import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
} from '@mui/material';
import { useWeb3 } from '../contexts/Web3Context';
import { useRealm } from '../contexts/RealmContext';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useWeb3();
  const { realms, createRealm, isLoading } = useRealm();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    radius: '',
  });

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      name: '',
      location: '',
      latitude: '',
      longitude: '',
      radius: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      await createRealm(
        formData.name,
        formData.location,
        parseFloat(formData.latitude),
        parseFloat(formData.longitude),
        parseFloat(formData.radius)
      );
      handleClose();
    } catch (error) {
      console.error('Error creating realm:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          AR Realms
        </Typography>
        {isConnected && (
          <Button variant="contained" color="primary" onClick={handleClickOpen}>
            Create Realm
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {realms.map((realm) => (
          <Grid item xs={12} sm={6} md={4} key={realm.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/realm/${realm.id}`)}
            >
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  {realm.name}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  {realm.location}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Businesses: {realm.businesses.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Events: {realm.eventIds.length}
                </Typography>
                <Typography
                  variant="body2"
                  color={realm.active ? 'success.main' : 'error.main'}
                >
                  {realm.active ? 'Active' : 'Inactive'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Create New Realm</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Realm Name"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="location"
            label="Location"
            type="text"
            fullWidth
            value={formData.location}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="latitude"
            label="Latitude"
            type="number"
            fullWidth
            value={formData.latitude}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="longitude"
            label="Longitude"
            type="number"
            fullWidth
            value={formData.longitude}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="radius"
            label="Radius (meters)"
            type="number"
            fullWidth
            value={formData.radius}
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Home; 