package com.snsu.cciscodehub;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.widget.VideoView;

public class SplashActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fullscreen immersive
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        setContentView(R.layout.activity_splash);

        VideoView videoView = findViewById(R.id.splashVideo);

        // Load the video from res/raw
        Uri videoUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.splash_video);
        videoView.setVideoURI(videoUri);

        // When video finishes, launch the main app
        videoView.setOnCompletionListener(mp -> {
            startMainActivity();
        });

        // If video fails to load, skip to main activity
        videoView.setOnErrorListener((mp, what, extra) -> {
            startMainActivity();
            return true;
        });

        videoView.start();
    }

    private void startMainActivity() {
        Intent intent = new Intent(this, MainActivity.class);
        // Forward any deep link intent
        if (getIntent() != null && getIntent().getData() != null) {
            intent.setData(getIntent().getData());
        }
        startActivity(intent);
        finish();
        // No transition animation for a clean handoff
        if (Build.VERSION.SDK_INT >= 34) {
            overrideActivityTransition(OVERRIDE_TRANSITION_OPEN, 0, 0);
        } else {
            overridePendingTransition(0, 0);
        }
    }
}
