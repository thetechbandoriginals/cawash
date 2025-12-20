import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cawash',
    short_name: 'Cawash',
    description: 'Find the best carwash services near you with Cawash. Search for your service history, and keep your car sparkling clean.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1BA2CF',
    theme_color: '#1BA2CF',
    icons: [
      {
        src: '/icons/cawash192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/cawash512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
