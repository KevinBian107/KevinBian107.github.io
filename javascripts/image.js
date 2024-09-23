// Array of image sources
const images = [
    // 'assets/profile_kaiwen_picture_3.jpg',
    // 'assets/profile_kaiwen_picture_2.JPG',
    'assets/profile_kaiwen_picture_1.PNG',
    // Add more image sources here
];

function getRandomImage() {
    const index = Math.floor(Math.random() * images.length);
    return images[index];
}

function setRandomImages() {
    let img1;
    img1 = getRandomImage();

    document.getElementById('image1').src = img1;
}

// Set random images on page load
window.onload = setRandomImages;
