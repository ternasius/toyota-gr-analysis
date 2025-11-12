# Race Telemetry Dashboard

Interactive React web application for visualizing Toyota GR Cup telemetry and lap data.

## Project Setup

This project is built with:

- **Vite** - Fast build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type safety with strict mode enabled
- **Tailwind CSS** - Utility-first styling with custom racing theme
- **Zustand** - Lightweight state management
- **Plotly.js** - Interactive charting library
- **idb** - IndexedDB wrapper for caching
- **pako** - Gzip compression/decompression
- **lucide-react** - Icon library

## Racing Theme

The dashboard uses a professional racing aesthetic:

- **Background**: `#0b0b0b` (near-black)
- **Accent**: `#C8102E` (Toyota red)
- **Monospace font** for lap times and telemetry values

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

Environment variables can be set in a `.env` file:

```env
VITE_DATA_BASE_URL=/datasets_trimmed
```

Application configuration is in `src/config.ts`.

## Path Aliases

The following path aliases are configured:

- `@/*` → `src/*`
- `@/components/*` → `src/components/*`
- `@/lib/*` → `src/lib/*`
- `@/hooks/*` → `src/hooks/*`
- `@/store/*` → `src/store/*`
- `@/types/*` → `src/types/*`
- `@/utils/*` → `src/utils/*`

## Project Structure

```
dashboard/
├── src/
│   ├── components/     # React components
│   ├── lib/           # Library utilities
│   ├── hooks/         # Custom React hooks
│   ├── store/         # Zustand state management
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── config.ts      # Application configuration
│   ├── App.tsx        # Main app component
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles with Tailwind
├── public/            # Static assets
└── dist/              # Production build output
```

## TypeScript Configuration

- Strict mode enabled
- Path aliases configured
- ES2022 target
- React JSX transform

## Next Steps

Follow the implementation plan in `.kiro/specs/race-telemetry-dashboard/tasks.md` to build out the dashboard features.
