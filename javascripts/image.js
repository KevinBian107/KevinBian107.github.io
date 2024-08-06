// Array of image sources
const images = [
    'assets/profile_kaiwen_picture_3.jpg',
    'assets/profile_kaiwen_picture_2.JPG'
    // Add more image sources here
];

function getRandomImage() {
    const index = Math.floor(Math.random() * images.length);
    return images[index];
}

function setRandomImages() {
    let img1, img2;
    do {
        img1 = getRandomImage();
        img2 = getRandomImage();
    } while (img1 === img2); // Ensure the two images are different

    document.getElementById('image1').src = img1;
    document.getElementById('image2').src = img2;
}

// Set random images on page load
window.onload = setRandomImages;
