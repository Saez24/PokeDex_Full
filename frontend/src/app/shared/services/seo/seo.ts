import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
    private title = inject(Title);
    private meta = inject(Meta);

    setPage(config: {
        title: string;
        description?: string;
        image?: string;
        url?: string;
    }): void {
        const fullTitle = config.title.includes('PokéDex')
            ? config.title
            : `${config.title} | PokéDex`;

        this.title.setTitle(fullTitle);

        const description =
            config.description ?? 'Entdecke alle Pokémon – Stats, Typen, Moves und mehr.';

        this.meta.updateTag({ name: 'description', content: description });
        this.meta.updateTag({ property: 'og:title', content: fullTitle });
        this.meta.updateTag({ property: 'og:description', content: description });
        this.meta.updateTag({ property: 'og:type', content: 'website' });

        if (config.image) {
            this.meta.updateTag({ property: 'og:image', content: config.image });
            this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
            this.meta.updateTag({ name: 'twitter:image', content: config.image });
        }

        if (config.url) {
            this.meta.updateTag({ property: 'og:url', content: config.url });
        }
    }
}
