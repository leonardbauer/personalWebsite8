<script>
	import { player } from "$lib/stores/player.svelte";
</script>

{#if player.pendingPlayId}
	<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="epilepsy-title">
		<div class="modal">
			<h2 id="epilepsy-title">⚠ Photosensitivity warning</h2>
			<p>
				Playback drives full-screen flashes, strobes, and rapid color changes synced
				to the music. This may trigger seizures in people with photosensitive epilepsy.
			</p>
			<p>
				If you have a photosensitive condition, do not continue.
			</p>
			<div class="actions">
				<button class="cancel" onclick={() => player.cancelEpilepsy()}>cancel</button>
				<button class="confirm" onclick={() => player.confirmEpilepsy()}>I understand, continue</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
	}
	.modal {
		background: #1a1a1a;
		color: #fff;
		border: 1px solid #333;
		border-radius: 8px;
		padding: 24px;
		max-width: 480px;
		font-family: ui-monospace, monospace;
	}
	h2 {
		font-size: 18px;
		margin: 0 0 12px;
		color: #ffb84d;
		background: transparent;
		font-variation-settings: normal;
	}
	p {
		font-size: 13px;
		line-height: 1.5;
		margin: 0 0 12px;
		opacity: 0.85;
	}
	.actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
		margin-top: 16px;
	}
	button {
		font-family: inherit;
		font-size: 12px;
		padding: 8px 14px;
		border-radius: 4px;
		border: 1px solid #444;
		cursor: pointer;
		background: #2a2a2a;
		color: #fff;
	}
	button:hover {
		background: #333;
	}
	.confirm {
		background: #ff6b6b;
		border-color: #ff6b6b;
		color: #000;
	}
	.confirm:hover {
		background: #ff8585;
	}
</style>
