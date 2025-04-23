<script lang="ts">
  import LoadingSpinner from '$lib/components/shared-components/loading-spinner.svelte';
  import { loopVideo as loopVideoPreference, videoViewerMuted, videoViewerVolume } from '$lib/stores/preferences.store';
  import { getAssetPlaybackUrl, getAssetThumbnailUrl } from '$lib/utils';
  import { handleError } from '$lib/utils/handle-error';
  import { AssetMediaSize } from '@immich/sdk';
  import { onDestroy, onMount } from 'svelte';
  import { swipe } from 'svelte-gestures';
  import type { SwipeCustomEvent } from 'svelte-gestures';
  import { fade } from 'svelte/transition';
  import { t } from 'svelte-i18n';
  import { isFaceEditMode } from '$lib/stores/face-edit.svelte';
  import FaceEditor from '$lib/components/asset-viewer/face-editor/face-editor.svelte';
  import CircleIconButton from '$lib/components/elements/buttons/circle-icon-button.svelte';
  import { mdiPause, mdiPlay, mdiFullscreen, mdiFullscreenExit } from '@mdi/js';
  import { Duration } from 'luxon';

  interface Props {
    assetId: string;
    loopVideo: boolean;
    cacheKey: string | null;
    onPreviousAsset?: () => void;
    onNextAsset?: () => void;
    onVideoEnded?: () => void;
    onVideoStarted?: () => void;
    onClose?: () => void;
  }

  let {
    assetId,
    loopVideo,
    cacheKey,
    onPreviousAsset = () => {},
    onNextAsset = () => {},
    onVideoEnded = () => {},
    onVideoStarted = () => {},
    onClose = () => {},
  }: Props = $props();

  let wrapper: HTMLDivElement | undefined = $state();
  let videoPlayer: HTMLVideoElement | undefined = $state();
  let isLoading = $state(true);
  let assetFileUrl = $state('');
  let forceMuted = $state(false);
  let isScrubbing = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let paused = $state(false);
  let isFullscreen = $state(false);

  const videoPlayerVolumePercent = $derived(Math.floor($videoViewerVolume * 100));

  onMount(() => {
    if (videoPlayer) {
      assetFileUrl = getAssetPlaybackUrl({ id: assetId, cacheKey });
      forceMuted = false;
      videoPlayer.load();
    }
  });

  onDestroy(() => {
    if (videoPlayer) {
      videoPlayer.src = '';
    }
  });

  const handleCanPlay = async (video: HTMLVideoElement) => {
    try {
      if (!video.paused && !isScrubbing) {
        await video.play();
        onVideoStarted();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError' && !forceMuted) {
        await tryForceMutedPlay(video);
        return;
      }

      handleError(error, $t('errors.unable_to_play_video'));
    } finally {
      isLoading = false;
    }
  };

  const tryForceMutedPlay = async (video: HTMLVideoElement) => {
    try {
      video.muted = true;
      await handleCanPlay(video);
    } catch (error) {
      handleError(error, $t('errors.unable_to_play_video'));
    }
  };

  const onSwipe = (event: SwipeCustomEvent) => {
    if (event.detail.direction === 'left') {
      onNextAsset();
    }
    if (event.detail.direction === 'right') {
      onPreviousAsset();
    }
  };

  let containerWidth = $state(0);
  let containerHeight = $state(0);

  $effect(() => {
    if (isFaceEditMode.value) {
      videoPlayer?.pause();
    }
  });

  const formatSeconds = (seconds: number) => {
    if (Number.isNaN(seconds)) seconds = 0;
    const duration = Duration.fromObject({ seconds });
    return duration.toFormat(duration.hours > 0 ? 'hh:mm:ss' : 'mm:ss');
  };
</script>

<div
  bind:this={wrapper}
  transition:fade={{ duration: 150 }}
  class="flex h-full select-none place-content-center place-items-center"
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
>
  <video
    bind:this={videoPlayer}
    loop={$loopVideoPreference && loopVideo}
    autoplay
    playsinline
    controls
    class="h-full object-contain"
    use:swipe={() => ({})}
    onswipe={onSwipe}
    oncanplay={(e) => handleCanPlay(e.currentTarget)}
    onended={onVideoEnded}
    onvolumechange={(e) => {
      if (!forceMuted) {
        $videoViewerMuted = e.currentTarget.muted;
      }
    }}
    onseeking={() => (isScrubbing = true)}
    onseeked={() => (isScrubbing = false)}
    onplaying={(e) => {
      e.currentTarget.focus();
    }}
    onclose={() => onClose()}
    muted={forceMuted || $videoViewerMuted}
    bind:volume={$videoViewerVolume}
    poster={getAssetThumbnailUrl({ id: assetId, size: AssetMediaSize.Preview, cacheKey })}
    src={assetFileUrl}
    bind:currentTime
    bind:duration
    bind:paused
  >
  </video>

  <div
    class="absolute bottom-4 text-immich-fg bg-immich-bg dark:bg-immich-dark-bg dark:text-immich-dark-fg rounded-xl px-4 py-2 flex gap-4 align-middle"
  >
    <CircleIconButton title="TODO" icon={paused ? mdiPlay : mdiPause} onclick={() => (paused = !paused)} />

    <span class="w-48 text-right self-center">{formatSeconds(currentTime)} / {formatSeconds(duration)}</span>
    <input type="range" bind:value={currentTime} max={duration} step={0.01} />

    <span class="w-12 text-right self-center">{videoPlayerVolumePercent}%</span>
    <input type="range" bind:value={$videoViewerVolume} max={1} step={0.01} />

    <CircleIconButton
      title="TODO"
      icon={isFullscreen ? mdiFullscreenExit : mdiFullscreen}
      onclick={async () => {
        if (isFullscreen) await document.exitFullscreen();
        else await wrapper?.requestFullscreen();

        isFullscreen = !isFullscreen;
      }}
    />
  </div>

  {#if isLoading}
    <div class="absolute flex place-content-center place-items-center">
      <LoadingSpinner />
    </div>
  {/if}

  {#if isFaceEditMode.value}
    <FaceEditor htmlElement={videoPlayer} {containerWidth} {containerHeight} {assetId} />
  {/if}
</div>
