import { useMemo, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

type LessonContentProps = {
  content: string;
};

const wrapHtml = (content: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 16px;
        background: #FFFFFF;
        color: #1F2937;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        word-wrap: break-word;
      }
      img, video, iframe { max-width: 100%; height: auto; border-radius: 8px; }
      iframe { width: 100% !important; aspect-ratio: 16 / 9; }
      table { width: 100% !important; border-collapse: collapse; }
      table td, table th { border: 1px solid #E5E7EB; padding: 6px 8px; }
      pre, code { background: #F3F4F6; padding: 8px; border-radius: 6px; overflow-x: auto; }
      a { color: #2563EB; word-break: break-word; }
      h1, h2, h3, h4 { color: #111827; }
    </style>
  </head>
  <body>
    ${content}
    <script>
      (function () {
        function postHeight() {
          var h = document.documentElement.scrollHeight;
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(String(h));
        }
        window.addEventListener("load", postHeight);
        window.addEventListener("resize", postHeight);
        setTimeout(postHeight, 250);
        setTimeout(postHeight, 1000);
      })();
    </script>
  </body>
</html>`;

export function LessonContent({ content }: LessonContentProps) {
  const [height, setHeight] = useState(400);
  const html = useMemo(() => wrapHtml(content), [content]);

  if (!content) return null;

  return (
    <View style={{ height }}>
      <WebView
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://youpass.vn" }}
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data);
          if (Number.isFinite(next) && next > 0 && Math.abs(next - height) > 4) {
            setHeight(next);
          }
        }}
        style={{ backgroundColor: "#FFFFFF" }}
      />
    </View>
  );
}
