
export class ImgGenUI {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Image generation controls
        const filtersBtn = document.getElementById('filtersBtn');
        const filtersPopup = document.getElementById('filtersPopup');
        const closeFiltersBtn = document.getElementById('closeFiltersBtn');
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        const uploadImageBtn = document.getElementById('uploadImageBtn');
        const imageUpload = document.getElementById('imageUpload');
        const newImageBtn = document.getElementById('newImageBtn');
        const storyBookBtn = document.getElementById('storyBookBtn');
        const birthdayCardBtn = document.getElementById('birthdayCardBtn');

        if (filtersBtn && filtersPopup) {
            filtersBtn.addEventListener('click', () => {
                filtersPopup.style.display = 'flex';
            });
        }

        if (closeFiltersBtn) {
            closeFiltersBtn.addEventListener('click', () => {
                filtersPopup.style.display = 'none';
            });
        }

        if (uploadImageBtn && imageUpload) {
            uploadImageBtn.addEventListener('click', () => {
                imageUpload.click();
            });

            imageUpload.addEventListener('change', this.handleImageUpload.bind(this));
        }

        if (newImageBtn) {
            newImageBtn.addEventListener('click', this.handleNewImage.bind(this));
        }

        if (storyBookBtn) {
            storyBookBtn.addEventListener('click', this.toggleStoryBookMode.bind(this));
        }

        if (birthdayCardBtn) {
            birthdayCardBtn.addEventListener('click', this.toggleBirthdayCardMode.bind(this));
        }
    }

    handleImageUpload(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageDisplay = document.getElementById('imageDisplay');
                if (imageDisplay) {
                    imageDisplay.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.classList.add('generated-image');
                    img.alt = 'Uploaded image';
                    imageDisplay.appendChild(img);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    }

    handleNewImage() {
        const imageDisplay = document.getElementById('imageDisplay');
        if (imageDisplay) {
            imageDisplay.innerHTML = '<div class="placeholder-text">Generated images will appear here</div>';
        }
    }

    toggleStoryBookMode(e) {
        const btn = e.target;
        btn.classList.toggle('active');
        if (btn.classList.contains('active')) {
            document.getElementById('birthdayCardBtn')?.classList.remove('active');
        }
    }

    toggleBirthdayCardMode(e) {
        const btn = e.target;
        btn.classList.toggle('active');
        if (btn.classList.contains('active')) {
            document.getElementById('storyBookBtn')?.classList.remove('active');
        }
    }
}
