// icon values must match lucide-react component names — rendered in EmergencyCallModal
export const EMERGENCY_CONTACTS = {
    police:         { name: 'Police',         number: '100',  icon: 'Shield',      color: '#3B82F6' },
    ambulance:      { name: 'Ambulance',      number: '108',  icon: 'HeartPulse',  color: '#EF4444' },
    fire:           { name: 'Fire Brigade',   number: '101',  icon: 'Flame',       color: '#F97316' },
    women_helpline: { name: 'Women Helpline', number: '1091', icon: 'UserCheck',   color: '#8B5CF6' }
};

export const EMERGENCY_CONTACTS_ARRAY = Object.entries(EMERGENCY_CONTACTS).map(([key, value]) => ({
    key,
    ...value
}));
