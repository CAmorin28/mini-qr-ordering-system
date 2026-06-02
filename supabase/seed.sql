-- Run after schema.sql to load the default menu into products

insert into public.products (id, name, price, category, image_url, emoji) values
  ('caesar-salad', 'Caesar Salad', 12, 'starters', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAB8lyLU1zpvvTcsDkvGknCcyjyKGG93FZ80pvh6QLL6wzEYIxUHZpWGwstiitRy2ZDmYC-GzUeo8jjQUgcixGbsGRhR-I9gwQZbxWKvo_4BFqvnWT4Scl0ZcS4e0fVNbydhn8O4AMEMH88TvKv48x6P0__FWJVt90xFX2y2egC-wZTmVJFTlHKx5u6CSGG0eEHSjDAAiMrLJrGS5d0elmRZSwqOqAyQPAYk58Do6N0HE2U052yBn9g_jfDH34-lrJDgFKG7EnQtxk', null),
  ('grilled-ribs', 'Grilled Ribs', 35, 'mains', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuHw4XNHR9BNOFNQVdhA34r7DhEDBy0-0DtLbTiJ-NBNeUfw41U6yCqL3KksgHD_tp3P67TOlQDLtpUzwQOvFFTm5ncJE-GZ2KMtPfFavoqj7CxukL6R5G3MJge4CZDS8bNZxQ2xOpXWLhe33FPaq0wj6_Ud2p3DpBcXlmlQjeS8wrvugDta0IWsiSeT3vHWK9smBdzokf4IoYDEVBkr06BN0P3dz5jpdav8p0-uuQNl6usdclomN0SYs-NsM9SEnBfbbckx40PSY', null),
  ('ramen-bowl', 'Ramen Bowl', 22, 'mains', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC14WIi9zFycO5TlAwGstf-Y15T8cC2hLu1loa9kILr3ty96DvNdxtSpQ2PhagnZUD5GCTqJC6Elu6WD-GE2ZmMZupnE37Kquq5Xcx-NR4uDGB4MyfDkLTF9susACcb04B7wVwnrLon_m8YXOXPouvQASpyT3xmWpMlJ-y86gV_eRaTlTkFuv6baFLaoVwzcYkrRSk7tySb5SljCl7D_MOij-n3rrUeWclWklbzeoQcaXC_zgi-ksGqNGwEuHH8wEyiRqc0zkW4B6I', null),
  ('lemon-iced-tea', 'Lemon Iced Tea', 6, 'drinks', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhYcBWOQkENz6ikkkBkkM235K29Dx5aGfyxRloBoE9tFVsiKHDkf_mm-nbm3x3g-_hDLC3zGim2gJF3TkalCp20sLR2AS3BZ8VZq5g_uL2pop5HMrBqEgrsg8qBPainxbNbKpWFqAmjWRbJC_i4roxrZ-9V9FOXcmDC8FKiPvWIMnfeNUiauLhITY7TFuSyUKxTuBN-t4tJr--QNQH0uJdmyBcwhNsUd5GXp1qlMFzxDMwSxOCykqPfz_U-BCuceXJ2XqGyQ-dick', null),
  ('classic-burger', 'Classic Burger', 18, 'mains', null, '🍔'),
  ('french-fries', 'French Fries', 9, 'starters', null, '🍟'),
  ('chocolate-cake', 'Chocolate Cake', 14, 'desserts', null, '🍰')
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  category = excluded.category,
  image_url = excluded.image_url,
  emoji = excluded.emoji;
