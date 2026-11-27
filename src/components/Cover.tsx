import { useEffect, useState } from 'react';
import type { VinylRecord } from '../data/types';
import { useApp } from '../state/AppContext';
import { fallbackColor, readableOn } from './colors';

const cache = new Map<string, Promise<string | null>>();

const resolve = (url: string) =>
  !url || /^(https?:|data:|blob:)/.test(url) ? url : `${import.meta.env.BASE_URL}${url}`;

/** The picture to show for a record; empty while a saved thumbnail is loading. */
export function useCoverSrc(record: VinylRecord | undefined): string {
  const { repo } = useApp();
  const id = record?.id ?? '';
  const version = record?.coverVersion ?? 0;
  const key = `${repo.key}:${id}:${version}`;
  const [stored, setStored] = useState<{ key: string; src: string | null }>();

  useEffect(() => {
    if (!version) return;
    let live = true;
    let request = cache.get(key);
    if (!request) {
      request = repo.getCover(id, version).catch(() => {
        cache.delete(key);
        return null;
      });
      cache.set(key, request);
    }
    request.then((src) => live && setStored({ key, src }));
    return () => {
      live = false;
    };
  }, [key, repo, id, version]);

  if (!record) return '';
  if (!version) return resolve(record.links.coverUrl);
  if (stored?.key !== key) return '';
  return stored.src ?? resolve(record.links.coverUrl);
}

interface ImageProps {
  src: string;
  title: string;
  artist: string;
  color?: string;
  className?: string;
  alt?: string;
}

/** Square artwork with a titled colour block when there is no picture. */
export function CoverImage({ src, title, artist, color, className = '', alt }: ImageProps) {
  const [failed, setFailed] = useState('');
  const label = alt ?? `${title} cover`;
  if (src && failed !== src) {
    return (
      <img
        className={`cover ${className}`}
        src={src}
        alt={label}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(src)}
      />
    );
  }
  const background = color || fallbackColor(`${artist}${title}`);
  return (
    <span
      className={`cover cover-blank ${className}`}
      style={{ background, color: readableOn(background) }}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <span className="cover-blank-title">{title}</span>
      <span className="cover-blank-artist">{artist}</span>
    </span>
  );
}

export function Cover({ record, className, alt }: { record: VinylRecord; className?: string; alt?: string }) {
  const src = useCoverSrc(record);
  return (
    <CoverImage
      src={src}
      title={record.title}
      artist={record.artist}
      color={record.spineColor}
      className={className}
      alt={alt}
    />
  );
}
