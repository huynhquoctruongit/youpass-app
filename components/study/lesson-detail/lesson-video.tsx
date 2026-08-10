import { useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import { detectVideoType, extractYoutubeId } from "@/services/helpers/study";
import { Colors } from "@/services/constant";
import type { LessonVideoType } from "@/types/study";

type LessonVideoProps = {
  src: string;
  videoType?: LessonVideoType;
};

const baseHtml = (body: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; overflow: hidden; }
      .container { position: relative; width: 100%; height: 100%; }
      iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <div class="container">${body}</div>
  </body>
</html>`;

const buildEmbedHtml = (src: string, videoType: LessonVideoType) => {
  if (videoType === "youtube") {
    const videoId = extractYoutubeId(src) ?? src;
    return baseHtml(
      `<iframe src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`,
    );
  }
  if (videoType === "vimeo") {
    const vimeoId = src.toString().split("/").pop();
    return baseHtml(
      `<iframe src="https://player.vimeo.com/video/${vimeoId}?playsinline=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`,
    );
  }
  if (videoType === "spotlightr") {
    return baseHtml(
      `<iframe src="https://videos.cdn.spotlightr.com/watch/${src}?anonymous=true&autoplay=1&fallback=true" allow="autoplay; fullscreen" allowfullscreen></iframe>`,
    );
  }
  if (videoType === "wistia") {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; overflow: hidden; }
      .wistia_responsive_padding { padding: 0 !important; height: 100% !important; position: relative; }
      .wistia_responsive_wrapper { position: absolute; inset: 0; height: 100%; width: 100%; }
      .wistia_embed { height: 100%; position: relative; width: 100%; }
    </style>
    <script src="https://fast.wistia.com/assets/external/E-v1.js" async></script>
    <script src="https://fast.wistia.com/embed/medias/${src}.jsonp" async></script>
  </head>
  <body>
    <div class="wistia_responsive_padding">
      <div class="wistia_responsive_wrapper">
        <div class="wistia_embed wistia_async_${src} videoFoam=true playerColor=ff0033"></div>
      </div>
    </div>
  </body>
</html>`;
  }
  return baseHtml(`<iframe src="${src}" allow="autoplay; fullscreen" allowfullscreen></iframe>`);
};

export function LessonVideo({ src, videoType }: LessonVideoProps) {
  const resolvedType = detectVideoType(src, videoType);
  const html = useMemo(() => buildEmbedHtml(src, resolvedType), [src, resolvedType]);

  return (
    <View className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <WebView
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        domStorageEnabled
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://youpass.vn" }}
        startInLoadingState
        renderLoading={() => (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <ActivityIndicator color={Colors.primary["01"]} size="large" />
          </View>
        )}
        style={{ backgroundColor: "#000" }}
      />
    </View>
  );
}
