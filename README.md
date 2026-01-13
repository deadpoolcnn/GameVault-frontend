# GameVault NFT Marketplace

A modern NFT marketplace built with Next.js 15, wagmi v2, and stunning Neumorphism + Glassmorphism UI design.

![GameVault](./public/placeholder-nft.png)

## Features

- 🎮 **Gaming NFT Marketplace** - Trade gaming NFTs on Arbitrum Sepolia
- 🔗 **Multi-Wallet Support** - MetaMask, OKX Wallet, Trust Wallet, WalletConnect
- 🎨 **Modern UI Design** - Neumorphism cards, Glassmorphism buttons, Swiss Grid layout
- 🌓 **Dark/Light Mode** - Automatic theme detection with manual toggle
- ⚡ **Fast & Responsive** - Built with Next.js 15 App Router
- 🔐 **Web3 Integration** - wagmi v2 + viem for seamless blockchain interactions

## Core Functionality

1. **Wallet Connection** - Connect with multiple wallet providers
2. **Market Homepage** - Browse all listed NFTs
3. **My NFTs Page** - View and manage your NFT collection
4. **List NFT** - List your NFTs for sale with custom pricing
5. **Buy NFT** - Purchase NFTs from other users
6. **Cancel Listing** - Remove your NFTs from the marketplace

## Tech Stack

- **Framework**: Next.js 15 with TypeScript and App Router
- **Web3**: wagmi v2 + viem
- **UI Components**: shadcn/ui + Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **Notifications**: Sonner

## Smart Contracts

- **NFT Contract**: `0x25b488359EE6e4B611915B94CDd3ef92eB2e211a`
- **Marketplace Contract**: `0x8B50ef54eD818adE9D7628ab2248f48fe84e3AFC`
- **Network**: Arbitrum Sepolia (Chain ID: 421614)

## Prerequisites

**Important**: This project requires Node.js version 18.18.0 or higher.

- Node.js >= 18.18.0
- npm or yarn
- A Web3 wallet (MetaMask, OKX, Trust Wallet, etc.)
- WalletConnect Project ID (get from [WalletConnect Cloud](https://cloud.walletconnect.com))

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd GameVault-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your WalletConnect Project ID:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Market homepage
│   └── my-nfts/           # My NFTs page
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── header.tsx        # Navigation header
│   ├── nft-card.tsx      # NFT display card
│   ├── nft-grid.tsx      # NFT grid layout
│   └── ...               # Other components
├── config/               # Configuration files
│   └── wagmi.ts         # wagmi configuration
├── contracts/           # Smart contract ABIs
│   └── abis.ts         # Contract ABIs
├── hooks/              # Custom React hooks
│   └── use-marketplace.ts  # Marketplace contract hooks
├── lib/                # Utility functions
│   ├── constants.ts   # Constants and config
│   └── utils.ts       # Helper functions
├── providers/         # React context providers
│   ├── web3-provider.tsx    # Web3 provider
│   └── theme-provider.tsx   # Theme provider
├── store/            # Zustand stores
│   └── nft-store.ts  # NFT state management
└── types/           # TypeScript types
    └── nft.ts      # NFT type definitions
```

## Design System

### Neumorphism

- Soft shadows creating a 3D effect
- Used for cards and input fields
- Provides depth and tactile feel

### Glassmorphism

- Frosted glass effect with backdrop blur
- Used for buttons and overlays
- Modern, premium aesthetic

### Swiss Grid Layout

- Responsive grid system
- Automatic column adjustment
- Clean, organized presentation

### Gradient Backgrounds

- **Dark Mode**: Deep blue gradient (navy to dark slate)
- **Light Mode**: Light orange gradient (peach to cream)
- Smooth transitions between themes

### Hover Animations

- Lift effect on cards
- Glow effect on interactive elements
- Scale animations for emphasis

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Usage

### Connecting Your Wallet

1. Click "Connect Wallet" in the header
2. Select your preferred wallet provider
3. Approve the connection in your wallet

### Browsing NFTs

- Navigate to the Market page to see all listed NFTs
- View NFT details including name, description, and price
- Click "Buy Now" to purchase an NFT

### Managing Your NFTs

1. Navigate to "My NFTs" page
2. View all NFTs you own
3. Click "List NFT" to list an NFT for sale
4. Set your desired price in ETH
5. Approve the marketplace contract (first time only)
6. Confirm the listing transaction

### Buying NFTs

1. Browse the marketplace
2. Click "Buy Now" on an NFT you like
3. Review the purchase details
4. Confirm the transaction in your wallet

### Canceling Listings

1. Go to "My NFTs" page
2. Find your listed NFT
3. Click "Cancel Listing"
4. Confirm the transaction

## Customization

### Adding New Wallets

Edit `src/config/wagmi.ts` to add more wallet connectors:

```typescript
import { injected } from "wagmi/connectors";

injected({
  target: {
    id: "your-wallet",
    name: "Your Wallet",
    provider: (window) => window?.yourWallet,
  },
});
```

### Changing Theme Colors

Edit `tailwind.config.ts` to customize colors:

```typescript
colors: {
  primary: "your-color",
  // ... other colors
}
```

### Modifying Contract Addresses

Edit `src/lib/constants.ts`:

```typescript
export const CONTRACTS = {
  GAME_ITEM: "0xYourNFTContract",
  MARKETPLACE: "0xYourMarketplaceContract",
};
```

## Troubleshooting

### Node.js Version Error

If you see "Node.js version ... is required", upgrade Node.js:

```bash
# Using nvm
nvm install 20
nvm use 20

# Or download from nodejs.org
```

### Wallet Connection Issues

- Ensure your wallet is installed and unlocked
- Check that you're on the correct network (Arbitrum Sepolia)
- Try refreshing the page

### Transaction Failures

- Ensure you have enough ETH for gas fees
- Check that the NFT is still available
- Verify contract approvals are set

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

- Open an issue on GitHub
- Check existing documentation
- Review the implementation plan in the artifacts directory

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Web3 integration with [wagmi](https://wagmi.sh/)
- Icons from [Lucide](https://lucide.dev/)
