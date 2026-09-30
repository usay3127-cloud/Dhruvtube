package com.dhruv.dhruvtube;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {

    private WebView webView;
    private Process nodeProcess;

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Handler handler = new Handler();

    private File serverDir;
    private File runtimeDir;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient());

        startNodeServer();
    }

    private void startNodeServer() {
        executor.execute(() -> {
            try {
                runtimeDir = new File(getFilesDir(), "node_runtime");
                serverDir = new File(getFilesDir(), "server_bundle");

                copyAssetTree("node_runtime", runtimeDir);
                copyAssetTree("server_bundle", serverDir);

                // Node is packaged as an Android native library.
                File node = new File(
                        getApplicationInfo().nativeLibraryDir,
                        "libnode.so"
                );

                if (!node.exists()) {
                    throw new IOException(
                            "Node native library missing: "
                                    + node.getAbsolutePath()
                    );
                }

                File libDir = new File(
                        getApplicationInfo().nativeLibraryDir
                );

                ProcessBuilder pb = new ProcessBuilder(
                        node.getAbsolutePath(),
                        new File(serverDir, "server.js").getAbsolutePath()
                );

                pb.directory(serverDir);
                pb.redirectErrorStream(true);

                pb.environment().put(
                        "LD_LIBRARY_PATH",
                        libDir.getAbsolutePath()
                );

                pb.environment().put(
                        "NODE_PATH",
                        new File(
                                serverDir,
                                "node_modules"
                        ).getAbsolutePath()
                );

                nodeProcess = pb.start();

                executor.execute(() -> {
                    try {
                        InputStream output =
                                nodeProcess.getInputStream();

                        byte[] buffer = new byte[1024];
                        int count;

                        while ((count = output.read(buffer)) != -1) {
                            String line =
                                    new String(buffer, 0, count);

                            android.util.Log.d(
                                    "DhruvTubeNode",
                                    line
                            );
                        }
                    } catch (Exception e) {
                        android.util.Log.e(
                                "DhruvTubeNode",
                                "Node output error",
                                e
                        );
                    }
                });

                handler.postDelayed(() -> {
                    if (webView != null) {
                        webView.loadUrl(
                                "http://127.0.0.1:3000"
                        );
                    }
                }, 2000);

            } catch (Exception e) {

                android.util.Log.e(
                        "DhruvTubeNode",
                        "Node startup failed",
                        e
                );

                handler.post(() -> {
                    if (webView != null) {
                        webView.loadData(
                                "<h2>DhruvTube server failed to start</h2>"
                                        + "<pre>"
                                        + e.toString()
                                        + "</pre>",
                                "text/html",
                                "UTF-8"
                        );
                    }
                });
            }
        });
    }

    private void copyAssetTree(
            String assetPath,
            File destination
    ) throws IOException {

        String[] children = getAssets().list(assetPath);

        if (children == null || children.length == 0) {
            copyAssetFile(assetPath, destination);
            return;
        }

        if (!destination.exists() && !destination.mkdirs()) {
            throw new IOException(
                    "Cannot create: " + destination
            );
        }

        for (String child : children) {
            copyAssetTree(
                    assetPath + "/" + child,
                    new File(destination, child)
            );
        }
    }

    private void copyAssetFile(
            String assetPath,
            File destination
    ) throws IOException {

        File parent = destination.getParentFile();

        if (parent != null
                && !parent.exists()
                && !parent.mkdirs()) {

            throw new IOException(
                    "Cannot create parent: " + parent
            );
        }

        try (
                InputStream input =
                        getAssets().open(assetPath);

                FileOutputStream output =
                        new FileOutputStream(destination)
        ) {

            byte[] buffer = new byte[8192];
            int length;

            while ((length = input.read(buffer)) != -1) {
                output.write(buffer, 0, length);
            }
        }
    }

    @Override
    protected void onDestroy() {

        if (nodeProcess != null) {
            nodeProcess.destroy();
            nodeProcess = null;
        }

        executor.shutdownNow();

        if (webView != null) {
            webView.destroy();
        }

        super.onDestroy();
    }

    @Override
    public void onBackPressed() {

        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
