import urllib.request

url = "https://raw.githubusercontent.com/Wabz/Geometry-Dash-Soundtrack/master/Stereo%20Madness.mp3"
try:
    print("Downloading Stereo Madness from Github wrapper...")
    urllib.request.urlretrieve(url, "/Users/makibook/Macky-studio/GD-COMPLETE/stereo_madness.mp3")
    print("Download successful!")
except Exception as e:
    print(f"Direct download failed: {e}")
    # Backup: generate a synth version locally just in case
    print("You might need to download manually if Github is down")
