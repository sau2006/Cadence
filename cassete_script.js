const circleImg1 = document.querySelector('.circle-img1');
const circleImg2 = document.querySelector('.circle-img2');
let angle1 = 0;
let angle2 = 90;
function rotateImage() {
    angle1 += 2; // Adjust speed here
    angle2 += 3;
    circleImg1.style.transform = `rotate(${angle1}deg)`;
    circleImg2.style.transform = `rotate(${angle2}deg)`;
    requestAnimationFrame(rotateImage);
}

rotateImage();
