export interface Player {
    id: number;
    name: string;
    role: string;
    country: string;
    basePrice: number;
    isForeign: boolean;
    status: 'sold' | 'unsold' | 'current' | 'upcoming';
    soldPrice: number;
    teamId: string | null;
    image?: string;
    rating?: number;
    stats?: {
        matches: number;
        runs?: number;
        wickets?: number;
        avg?: number;
        sr: number;
        eco?: number;
    };
}

export interface Team {
    id: string;
    name: string;
    owner: string;
    budget: number; // In Crores
    squad: number[]; // Player IDs
    foreignCount: number;
    color: string;
    secondaryColor: string;
    isBot: boolean;
    logo?: string;
    short?: string;
    darkText?: boolean;
}

export interface AuctionState {
    currentPlayerId: number | null;
    currentBid: number;
    highestBidderId: string | null;
    timer: number;
    status: 'idle' | 'bidding' | 'sold' | 'unsold' | 'finished' | 'lobby';
    joinedPlayers: number;
    roomId?: string;
    maxHumans?: number;
    hostId?: string;
}
