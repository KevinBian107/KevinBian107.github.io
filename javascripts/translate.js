// function showTranslateOptions() {
//     var translateElement = document.getElementById('google_translate_element');
//     if (translateElement.style.display === 'block') {
//         translateElement.style.display = 'none';
//     } else {
//         translateElement.style.display = 'block';
//     }
// }

function showTranslateOptions() {
    var translateElement = document.getElementById('google_translate_element');
    var navList = document.querySelector('.nav-list');

    if (translateElement.style.display === 'block') {
        translateElement.style.display = 'none';
        // navList.style.top = '0'; // Resets to original top position when toolbar is hidden
    } else {
        translateElement.style.display = 'block';
        // navList.style.top = '30px'; // Moves down to make space for the translate bar, adjust as needed
    }
}