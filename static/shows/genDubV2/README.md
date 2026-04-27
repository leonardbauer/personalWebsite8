# genDub lightshow

Drop this folder into `static/shows/` of your SvelteKit project so the assets
serve at `/shows/genDub/...`. Then on your /music page, render:

```svelte
<LightShow src="/shows/genDub/show.json" />
```

The `<LightShow>` component is in `src/lib/components/effects/LightShow.svelte`.
