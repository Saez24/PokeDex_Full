import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { Theme } from './theme';

describe('Theme', () => {
  let service: Theme;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    service = TestBed.inject(Theme);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have isDarkMode as a signal', () => {
    expect(typeof service.isDarkMode()).toBe('boolean');
  });

  it('should update isDarkMode when toggleTheme is called', () => {
    const before = service.isDarkMode();
    service.toggleTheme();
    expect(service.isDarkMode()).toBe(!before);
  });
});
