import { ethers } from 'ethers';
import { BusinessProfile, RealmSystem } from '../typechain-types';
import { BusinessProfile__factory, RealmSystem__factory } from '../typechain-types/factories';
import 'aframe';
import 'ar.js';

interface GeoLocation {
    latitude: number;
    longitude: number;
    altitude?: number;
}

interface Business {
    id: string;
    name: string;
    description: string;
    category: string;
    location: string;
    coordinates: GeoLocation;
}

interface Realm {
    id: string;
    name: string;
    location: string;
    coordinates: GeoLocation;
    radius: number;
    businesses: string[];
    events: string[];
}

interface Event {
    id: string;
    title: string;
    description: string;
    startTime: number;
    endTime: number;
    maxParticipants: number;
    currentParticipants: number;
}

export class ARRealmManager {
    private scene: any;
    private camera: any;
    private businessProfile: BusinessProfile;
    private realmSystem: RealmSystem;
    private currentRealm: Realm | null = null;

    constructor(
        businessProfileAddress: string,
        realmSystemAddress: string,
        provider: ethers.providers.Provider
    ) {
        this.businessProfile = BusinessProfile__factory.connect(businessProfileAddress, provider);
        this.realmSystem = RealmSystem__factory.connect(realmSystemAddress, provider);
    }

    public async initializeAR(): Promise<void> {
        // Initialize A-Frame scene
        this.scene = document.querySelector('a-scene');
        if (!this.scene) {
            this.scene = document.createElement('a-scene');
            this.scene.setAttribute('embedded', '');
            this.scene.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false;');
            document.body.appendChild(this.scene);
        }

        // Add camera
        this.camera = document.createElement('a-entity');
        this.camera.setAttribute('camera', '');
        this.camera.setAttribute('gps-camera', 'simulateLatitude: 0; simulateLongitude: 0');
        this.scene.appendChild(this.camera);

        // Start location updates
        if ('geolocation' in navigator) {
            navigator.geolocation.watchPosition(
                (position) => this.handleLocationUpdate(position),
                (error) => console.error('Error getting location:', error),
                { enableHighAccuracy: true }
            );
        }
    }

    private async handleLocationUpdate(position: GeolocationPosition): Promise<void> {
        const userLocation: GeoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude || undefined
        };

        if (this.currentRealm) {
            const isInRealm = await this.realmSystem.isLocationInRealm(
                this.currentRealm.id,
                userLocation.latitude,
                userLocation.longitude
            );

            if (isInRealm) {
                await this.activateRealmFeatures();
            } else {
                await this.deactivateRealmFeatures();
            }
        }
    }

    private async activateRealmFeatures(): Promise<void> {
        if (!this.currentRealm) return;
        await this.showNearbyBusinesses();
        await this.showActiveEvents();
    }

    private async deactivateRealmFeatures(): Promise<void> {
        await this.hideNearbyBusinesses();
        await this.hideActiveEvents();
    }

    private async showNearbyBusinesses(): Promise<void> {
        if (!this.currentRealm) return;

        const businesses = await this.businessProfile.getRealmBusinesses(this.currentRealm.id);
        businesses.forEach(async (businessId) => {
            const business = await this.businessProfile.businesses(businessId);
            
            // Create business marker
            const marker = document.createElement('a-text');
            marker.setAttribute('value', business.name);
            marker.setAttribute('look-at', '[gps-camera]');
            marker.setAttribute('gps-entity-place', `latitude: ${business.latitude}; longitude: ${business.longitude}`);
            marker.setAttribute('scale', '20 20 20');
            this.scene.appendChild(marker);
        });
    }

    private async hideNearbyBusinesses(): Promise<void> {
        const markers = this.scene.querySelectorAll('[gps-entity-place]');
        markers.forEach((marker: Element) => marker.remove());
    }

    private async showActiveEvents(): Promise<void> {
        if (!this.currentRealm) return;
        // Implementation for showing active events
    }

    private async hideActiveEvents(): Promise<void> {
        // Implementation for hiding active events
    }

    public async createRealm(name: string, location: string, coordinates: GeoLocation, radius: number): Promise<void> {
        const tx = await this.realmSystem.createRealm(
            name,
            location,
            coordinates.latitude,
            coordinates.longitude,
            radius
        );
        await tx.wait();
    }

    public async addBusinessToRealm(businessId: string, realmId: string): Promise<void> {
        const tx = await this.realmSystem.addBusinessToRealm(businessId, realmId);
        await tx.wait();
    }

    public async recordInteraction(realmId: string, interactionType: string, data: string): Promise<void> {
        const tx = await this.realmSystem.recordInteraction(realmId, interactionType, data);
        await tx.wait();
    }
} 