ALTER TABLE settings
    ADD COLUMN theme_dark TEXT DEFAULT 'yakumo-dark' NOT NULL;
ALTER TABLE settings
    ADD COLUMN theme_light TEXT DEFAULT 'yakumo-light' NOT NULL;
