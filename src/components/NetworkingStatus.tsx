// Networking & visibility controls — the player's presence settings,
// in the battle page's friendly visual language (rounded cards, plain
// words, one tap to change). Three shapes, one source of truth
// (PresenceContext):
// - NetworkingControls: the full Profile card body — every status and
//   visibility as a selectable row with a plain-English description.
// - VenueNetworkingStrip: the compact version shown at the checked-in
//   venue, with the honest "You are visible as …" line, so a player
//   can go Quiet or Invisible without leaving the venue.
// - PersonStatusChip: a person's status dot + label for Who's Here.
import React from 'react';
import { Box, Button, Chip, FormControlLabel, Switch, TextField, Typography } from '@mui/material';
import { usePresence } from '../contexts/PresenceContext';
import {
  INDUSTRY_OPTIONS,
  INTEREST_TAGS,
  STATUS_META,
  STATUS_ORDER,
  VISIBILITY_META,
  VISIBILITY_ORDER,
  type NetworkingStatus as NetworkingStatusType,
} from '../utils/presence';

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const StatusDot: React.FC<{ status: NetworkingStatusType; size?: number }> = ({
  status,
  size = 10,
}) => (
  <Box
    component="span"
    sx={{
      width: size,
      height: size,
      borderRadius: '50%',
      bgcolor: STATUS_META[status].dot,
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
);

export const PersonStatusChip: React.FC<{ status: NetworkingStatusType }> = ({ status }) => (
  <Chip
    size="small"
    variant="outlined"
    icon={<StatusDot status={status} size={8} />}
    label={STATUS_META[status].label}
  />
);

export const NetworkingControls: React.FC = () => {
  const { networkingStatus, visibility, setNetworkingStatus, setVisibility } = usePresence();
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Your networking status
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
        {STATUS_ORDER.map(status => {
          const meta = STATUS_META[status];
          const selected = networkingStatus === status;
          return (
            <Button
              key={status}
              data-testid={`presence-status-${status}`}
              data-active={selected ? 'true' : 'false'}
              variant={selected ? 'contained' : 'outlined'}
              onClick={() => setNetworkingStatus(status)}
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderRadius: 3,
                textTransform: 'none',
                py: 1.25,
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ pt: 0.6 }}>
                  <StatusDot status={status} />
                </Box>
                <Box>
                  <Typography variant="subtitle2">{meta.label}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    {meta.description}
                  </Typography>
                </Box>
              </Box>
            </Button>
          );
        })}
      </Box>

      <Typography variant="subtitle1" gutterBottom>
        Who can see you at venues
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {VISIBILITY_ORDER.map(scope => {
          const meta = VISIBILITY_META[scope];
          const selected = visibility === scope;
          return (
            <Button
              key={scope}
              data-testid={`presence-visibility-${scope}`}
              data-active={selected ? 'true' : 'false'}
              variant={selected ? 'contained' : 'outlined'}
              onClick={() => setVisibility(scope)}
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderRadius: 3,
                textTransform: 'none',
                py: 1.25,
              }}
            >
              <Box>
                <Typography variant="subtitle2">{meta.label}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {meta.description}
                </Typography>
              </Box>
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};

// "I'm here for" — the match-context controls on Profile: which
// match types the player gets at all (Business / Networking / Dating
// toggles), their business (name + industry), and their interest
// tags. Dating is opt-in only: the switch starts OFF, and a dating
// match exists only when the other person opted in too.
export const ImHereForControls: React.FC = () => {
  const {
    hereForBusiness,
    hereForNetworking,
    hereForDating,
    setHereForBusiness,
    setHereForNetworking,
    setHereForDating,
    businessName,
    businessIndustry,
    setBusinessName,
    setBusinessIndustry,
    interests,
    toggleInterest,
  } = usePresence();
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        I’m here for
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        You are matched with people at your venue based on why you’re here. A match only ever starts
        a conversation — connecting stays a separate step you choose inside it, never automatic.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
        <FormControlLabel
          data-testid="herefor-business"
          control={
            <Switch
              checked={hereForBusiness}
              onChange={e => setHereForBusiness(e.target.checked)}
            />
          }
          label="Business — match me with people in my industry"
        />
        <FormControlLabel
          data-testid="herefor-networking"
          control={
            <Switch
              checked={hereForNetworking}
              onChange={e => setHereForNetworking(e.target.checked)}
            />
          }
          label="Networking — match me on shared interests"
        />
        <FormControlLabel
          data-testid="herefor-dating"
          control={
            <Switch checked={hereForDating} onChange={e => setHereForDating(e.target.checked)} />
          }
          label="Dating — open to dating intros"
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 4.5 }}>
          Off unless you turn it on. Only people who also opted in will ever see a dating match —
          and you will only see theirs.
        </Typography>
      </Box>

      {hereForBusiness && (
        <Box sx={{ mt: 2 }}>
          <TextField
            data-testid="business-name"
            label="Your business name"
            placeholder="e.g. Eddie’s Juice Bar"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <Typography variant="body2" gutterBottom>
            Your industry
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {INDUSTRY_OPTIONS.map(industry => (
              <Chip
                key={industry}
                data-testid={`industry-chip-${slug(industry)}`}
                data-active={businessIndustry === industry ? 'true' : 'false'}
                label={industry}
                color={businessIndustry === industry ? 'primary' : 'default'}
                variant={businessIndustry === industry ? 'filled' : 'outlined'}
                onClick={() => setBusinessIndustry(businessIndustry === industry ? '' : industry)}
                clickable
              />
            ))}
          </Box>
        </Box>
      )}

      {hereForNetworking && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Your interests
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {INTEREST_TAGS.map(tag => (
              <Chip
                key={tag}
                data-testid={`interest-chip-${slug(tag)}`}
                data-active={interests.includes(tag) ? 'true' : 'false'}
                label={tag}
                color={interests.includes(tag) ? 'primary' : 'default'}
                variant={interests.includes(tag) ? 'filled' : 'outlined'}
                onClick={() => toggleInterest(tag)}
                clickable
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export const VenueNetworkingStrip: React.FC = () => {
  const { networkingStatus, visibility, setNetworkingStatus, setVisibility } = usePresence();
  return (
    <Box
      data-testid="venue-networking-strip"
      sx={{ p: 2, mb: 2, borderRadius: 3, bgcolor: 'rgba(33,150,243,0.08)' }}
    >
      <Typography variant="body2" data-testid="you-are-visible" gutterBottom>
        👀 You are visible as: <strong>{VISIBILITY_META[visibility].label}</strong> · Your status:{' '}
        <strong>{STATUS_META[networkingStatus].label}</strong>
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        That is how people at this venue see you. Change it here, or anytime on your Profile.
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
        {STATUS_ORDER.map(status => (
          <Chip
            key={status}
            data-testid={`venue-status-${status}`}
            data-active={networkingStatus === status ? 'true' : 'false'}
            icon={<StatusDot status={status} size={8} />}
            label={STATUS_META[status].label}
            color={networkingStatus === status ? 'primary' : 'default'}
            variant={networkingStatus === status ? 'filled' : 'outlined'}
            onClick={() => setNetworkingStatus(status)}
            clickable
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {VISIBILITY_ORDER.map(scope => (
          <Chip
            key={scope}
            data-testid={`venue-visibility-${scope}`}
            data-active={visibility === scope ? 'true' : 'false'}
            label={VISIBILITY_META[scope].label}
            color={visibility === scope ? 'primary' : 'default'}
            variant={visibility === scope ? 'filled' : 'outlined'}
            onClick={() => setVisibility(scope)}
            clickable
          />
        ))}
      </Box>
    </Box>
  );
};
