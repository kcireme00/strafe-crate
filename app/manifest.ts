import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Strafe Crate",
    short_name: "Strafe Crate",
    description:
      "Premium monthly CS2 skin memberships with transparent fulfillment and collector progression.",
    start_url: "/",
    display: "standalone",
    background_color: "#080c12",
    theme_color: "#ff7628",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
