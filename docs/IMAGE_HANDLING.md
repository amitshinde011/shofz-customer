# Universal Image Aspect Ratio Handling

## Overview

This document describes the uniform image handling system across the LocalConnect app, ensuring that all images are fully visible (never cropped) while fitting perfectly into their designated containers on mobile, tablet, and desktop.

## Core Components

### 1. UniversalImage Component

**Location**: `src/components/UniversalImage.tsx`

The `UniversalImage` component is a reusable image wrapper that:
- Ensures full image visibility using `object-fit: contain`
- Provides responsive sizing based on device breakpoints
- Includes skeleton loading states
- Handles error states gracefully
- Maintains aspect ratios across all screen sizes

**Usage**:
```tsx
import UniversalImage from "@/components/UniversalImage";

<UniversalImage
  src="/path/to/image.jpg"
  alt="Description"
  size="card"
  loading="lazy"
/>
```

### 2. ResponsiveImage Component (Legacy)

**Location**: `src/components/ResponsiveImage.tsx`

Existing component that supports:
- Multiple predefined sizes
- Profile ring styling
- Gradient overlays
- Optional `object-fit: contain` mode

**Usage**:
```tsx
import { ResponsiveImage } from "@/components/ResponsiveImage";

<ResponsiveImage
  src="/path/to/image.jpg"
  alt="Description"
  size="profile"
  objectFit="contain"
/>
```

## Image Size Definitions

### UniversalImage Sizes

| Size | Mobile | Tablet | Desktop | Use Case |
|------|--------|--------|---------|----------|
| `thumbnail` | 60×60px | 80×80px | 100×100px | Small circular avatars, badges |
| `story` | 68×68px | 85×85px | 100×100px | Instagram-style story cards |
| `card` | 100%×200px | 100%×240px | 100%×300px | Offer cards, product cards |
| `banner` | 100%×120px | 100%×160px | 100%×200px | Header banners, hero images |
| `fullscreen` | 100vw×100vh | 100vw×100vh | 100vw×100vh | Story viewer, lightbox |

### ResponsiveImage Sizes

| Size | Description | CSS Class |
|------|-------------|-----------|
| `thumbnail` | 120px square | `img-container-thumbnail` |
| `card` | Full width, 1:1 aspect ratio | `img-container-card` |
| `detail` | Portrait 4:5, max 600px | `img-container-detail` |
| `gallery` | Square grid item | `img-container-gallery` |
| `profile` | 80px circular | `img-container-profile` |
| `profile-sm` | 64px circular | `img-container-profile-sm` |
| `profile-xs` | 40px circular | `img-container-profile-xs` |
| `banner` | 16:9 landscape | `img-container-banner` |
| `square` | 1:1 aspect ratio | `img-container-square` |
| `portrait` | 4:5 aspect ratio | `img-container-portrait` |
| `landscape` | 16:9 aspect ratio | `img-container-landscape` |

## Responsive Breakpoints

```css
/* Mobile: < 600px (default) */
.universal-image-container {
  width: [mobile-width];
  height: [mobile-height];
}

/* Tablet: 600px - 1023px */
@media (min-width: 600px) {
  .universal-image-container {
    width: [tablet-width];
    height: [tablet-height];
  }
}

/* Desktop: ≥ 1024px */
@media (min-width: 1024px) {
  .universal-image-container {
    width: [desktop-width];
    height: [desktop-height];
  }
}
```

## Implementation Examples

### Offer Story Cards

**File**: `src/components/OfferStoryCard.tsx`

```tsx
<UniversalImage
  src={offerImage}
  alt={offer.title}
  size="story"
  containerStyle={{
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    border: "3px solid white",
    backgroundColor: "white",
  }}
  style={{
    objectFit: "cover",  // Circular cards use cover
  }}
  loading="lazy"
/>
```

### Full-Screen Story Viewer

**File**: `src/components/OfferStoriesViewer.tsx`

```tsx
<UniversalImage
  src={offerImage}
  alt={offer.title}
  size="fullscreen"
  containerStyle={{
    width: "100%",
    height: "100%",
    borderRadius: 0,
  }}
  style={{
    objectFit: "contain",  // Full-screen uses contain
  }}
  loading="eager"
/>
```

### Shop Logo Badges

```tsx
<UniversalImage
  src={shopLogo}
  alt={shopName}
  size="thumbnail"
  containerStyle={{
    width: "40px",
    height: "40px",
    border: "2px solid white",
  }}
  style={{
    objectFit: "cover",
  }}
/>
```

## Object-Fit Modes

### `contain` (Default for UniversalImage)
- **Use case**: Full image visibility required
- **Behavior**: Entire image fits within container, aspect ratio preserved
- **Examples**: Story viewer, product detail images, banners
- **Result**: May show letterboxing/pillarboxing on different aspect ratios

### `cover` (Common for circular/card images)
- **Use case**: Fill entire container without gaps
- **Behavior**: Image covers container, may crop edges
- **Examples**: Circular avatars, card thumbnails, hero images
- **Result**: No gaps, but some cropping possible

## Loading States

### Skeleton Loader
```tsx
// Automatically shown while image loads
<div style={{
  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
}} />
```

### Error State
```tsx
// Automatically shown if image fails to load
<div style={{
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#e0e0e0",
  color: "#999",
}}>
  <span>Image unavailable</span>
</div>
```

## Accessibility

All image components support:
- `alt` text (required)
- `aria-label` for complex images
- Keyboard navigation (when clickable)
- Screen reader friendly error states
- `loading="lazy"` for performance

## Performance Optimization

1. **Lazy Loading**: Use `loading="lazy"` for off-screen images
2. **Eager Loading**: Use `loading="eager"` for above-the-fold images
3. **Skeleton Loaders**: Prevent layout shift during image load
4. **Error Handling**: Graceful fallbacks for missing images
5. **Responsive Images**: Serve appropriate sizes per breakpoint

## Custom Dimensions

For custom sizes, use `ResponsiveImageContainer`:

```tsx
import { ResponsiveImageContainer } from "@/components/UniversalImage";

<ResponsiveImageContainer
  width={{
    mobile: "100%",
    tablet: "400px",
    desktop: "600px",
  }}
  height={{
    mobile: "150px",
    tablet: "200px",
    desktop: "300px",
  }}
>
  <img
    src="/image.jpg"
    alt="Custom sized image"
    style={{ objectFit: "contain" }}
  />
</ResponsiveImageContainer>
```

## Testing Checklist

- [ ] Image displays without cropping on mobile (< 600px)
- [ ] Image displays without cropping on tablet (600-1023px)
- [ ] Image displays without cropping on desktop (≥ 1024px)
- [ ] Skeleton loader shows during image load
- [ ] Error state displays for broken images
- [ ] Alt text is descriptive and accurate
- [ ] Lazy loading works for off-screen images
- [ ] Images maintain aspect ratio on all devices
- [ ] No layout shift when images load
- [ ] Touch interactions work on mobile devices

## Migration Guide

### From old `<img>` tags to UniversalImage

**Before**:
```tsx
<img
  src={image}
  alt="Description"
  style={{ width: "100px", height: "100px", objectFit: "cover" }}
/>
```

**After**:
```tsx
<UniversalImage
  src={image}
  alt="Description"
  size="thumbnail"
  style={{ objectFit: "cover" }}
/>
```

### From ResponsiveImage to UniversalImage

**Before**:
```tsx
<ResponsiveImage
  src={image}
  alt="Description"
  size="card"
  objectFit="contain"
/>
```

**After**:
```tsx
<UniversalImage
  src={image}
  alt="Description"
  size="card"
  style={{ objectFit: "contain" }}
/>
```

## Troubleshooting

### Image appears cropped
- Check `objectFit` is set to `"contain"`
- Verify container dimensions match desired size
- Ensure no conflicting CSS on parent elements

### Image appears stretched
- Use `objectFit: "contain"` instead of `"cover"`
- Check aspect ratio of container matches image

### Skeleton loader doesn't show
- Verify image `src` is valid
- Check network tab for loading errors
- Ensure component is properly mounted

### Poor performance
- Use `loading="lazy"` for below-the-fold images
- Consider image optimization (WebP, compression)
- Check image file sizes (aim for < 200KB)

## Related Files

- `src/components/UniversalImage.tsx` - Main universal image component
- `src/components/ResponsiveImage.tsx` - Legacy responsive image component
- `src/components/OfferStoryCard.tsx` - Story card implementation
- `src/components/OfferStoriesViewer.tsx` - Full-screen viewer implementation
- `src/index.css` - Global image container styles
- `src/styles/revolutionary-design-system.css` - Design system styles
