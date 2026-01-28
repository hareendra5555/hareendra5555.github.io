const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const skillBubbles = document.querySelectorAll('.skill-bubble');
if (skillBubbles.length) {
  skillBubbles.forEach((bubble) => {
    bubble.addEventListener('click', () => {
      const isOpen = bubble.classList.contains('is-open');
      skillBubbles.forEach((item) => item.classList.remove('is-open'));
      if (!isOpen) {
        bubble.classList.add('is-open');
      }
    });
  });
}
