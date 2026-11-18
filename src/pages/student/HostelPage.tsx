import { BadgeCheck, BedDouble, Check, ChevronLeft, ChevronRight, Flag, Clock, Images, MapPin, QrCode, ShieldCheck, Star } from 'lucide-react';
import { HostelLocation } from '../../components/HostelLocation';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { amenIcon } from '../../components/amenityIcons';
import { Card } from '../../components/Card';
import { SaveButton } from '../../components/HostelCard';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState } from '../../components/States';
import { Art, Avatar, Btn, Rating, Skeleton, Stars } from '../../components/ui';
import { AMENITIES } from '../../data/catalog';
import type { Hostel, Review } from '../../data/types';
import { ugx } from '../../lib/format';
import { useIsPhone } from '../../lib/useIsPhone';
import { bookingSem, getHostel, reportListing, semDates, semName, savedIds, universityById } from '../../services/api';
import { Overlay } from '../../components/Overlay';
import { useToast } from '../../components/Toast';
import { useMe, useUser } from '../../services/session';
import { useNeedAccount } from '../../components/AccountGate';
import { useData } from '../../services/useData';
import { BookingFlow, RoomList } from './BookingFlow';

/** Spread of star ratings that matches the hostel's average, for the summary bars. */
function distribution(avg: number, n: number) {
  const w = [1, 2, 3, 4, 5].map(k => Math.exp(-((k - avg) ** 2) / 0.9));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map(x => Math.round((x / sum) * n)).reverse(); // 5 stars first
}

export function HostelPage() {
  const { id = '' } = useParams(); const me = useUser(); const phone = useIsPhone(); const nav = useNavigate(); const need = useNeedAccount();
  const { data, loading, error, reload } = useData(() => getHostel(id), [id]);
  const [sel, setSel] = useState<number | null>(null);
  const [show, setShow] = useState<number | null>(null);
  const [booking, setBooking] = useState(false); const [flag, setFlag] = useState(false); const [flagRev, setFlagRev] = useState<Review | null>(null);
  const reportReview = (v: Review) => { if (need('report')) setFlagRev(v); };
  if (error && !data) return error === 'Hostel not found'
    ? <EmptyState icon={<MapPin size={24} />} title="Hostel not found" text="It may have been removed by the owner." action={<Link to="/s/explore" className="btn btn-secondary">Back to Explore</Link>} />
    : <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return phone ? <div className="m-main"><Skeleton rows={4} h={160} /></div> : <div className="hpx"><div className="skel" style={{ height: 400, borderRadius: 22 }} /><Skeleton rows={2} h={200} /></div>;
  const h = data!.hostel;
  // Open on the cheapest room that still has space, so the price matches the "From" price on Explore.
  const room = sel ?? cheapestFree(h);
  const r = h.rooms[room]!; const sem = bookingSem(h); const bookable = !!sem && r.total > r.taken;
  const saved = me ? savedIds(me.id).includes(h.id) : false;
  const back = () => (window.history.length > 1 ? nav(-1) : nav('/s/explore'));
  const flow = <>{booking && <BookingFlow h={h} room={room} onRoom={setSel} onClose={() => setBooking(false)} />}{flag && <ReportListing hid={h.id} name={h.name} onClose={() => setFlag(false)} />}{flagRev && <ReportListing hid={h.id} name={h.name} review={flagRev} onClose={() => setFlagRev(null)} />}</>;
  const sections = <Sections h={h} reviews={data!.reviews} room={room} onRoom={setSel} onReport={reportReview} />;
  const badges = <div className="row wrap" style={{ gap: 8 }}>{h.verified && <Pill tone="primary"><BadgeCheck size={13} />Verified owner</Pill>}<Pill tone="neutral">Booking fee {ugx(h.fee)}</Pill></div>;

  if (phone) return <>
    <div className="m-hero"><Art hostel={h} />
      <button className="float left" onClick={back} aria-label="Back"><ChevronLeft size={22} /></button>
      <SaveButton userId={me?.id} hostel={h} saved={saved} className="float right" />
    </div>
    <div className="m-sheet-top"><main className="m-main" style={{ paddingBottom: 120 }}>
      <div className="stack-sm"><div className="row between start"><h1 style={{ fontSize: 24, lineHeight: '30px' }}>{h.name}</h1><Rating value={h.rating} count={h.nRev} /></div>
        <p className="row-sm muted small"><MapPin size={14} />{h.km} km from {universityById(h.uni)?.short} · {h.area}</p>{badges}</div>
      {sections}
      <section className="stack-sm"><h3>Location</h3><HostelLocation h={h} height={180} /></section>
      <button className="btn btn-text btn-sm" style={{ alignSelf: 'center', color: 'var(--muted)' }} onClick={() => need('report') && setFlag(true)}><Flag size={15} />Report this listing</button>
    </main></div>
    <div className="m-cta"><div><div className="price">{ugx(r.price)}<span> / sem</span></div><div className="small muted clamp1">{r.t}</div></div>
      <Btn disabled={!bookable} onClick={() => need('book') && setBooking(true)}>{sem ? 'Book now' : 'Not open'}</Btn></div>
    {flow}
  </>;

  const uniShort = universityById(h.uni)?.short;
  const left = h.rooms.reduce((n, x) => n + Math.max(0, x.total - x.taken), 0);
  const reviews = data!.reviews;
  const bookLabel = !sem ? 'Not taking bookings right now' : bookable ? `Book for ${ugx(h.fee)}` : 'This room type is full';
  return <>
    <header className="hp-head">
      <button className="round-btn" onClick={back} aria-label="Back to Explore"><ChevronLeft size={20} /></button>
      <div className="hp-titles">
        <div className="row-sm" style={{ gap: 10 }}><h1 className="clamp1">{h.name}</h1>
          {h.verified && <span className="hp-ver" title="The owner's identity and documents were checked by Nestly"><BadgeCheck size={16} />Verified</span>}</div>
        <p className="hp-meta"><Rating value={h.rating} count={h.nRev} /><span className="dotsep" /><span className="row-sm"><MapPin size={14} />{h.km} km from {uniShort}</span><span className="dotsep" /><span>{h.area}</span></p>
      </div>
      <SaveButton userId={me?.id} hostel={h} saved={saved} className="round-btn" />
    </header>

    <div className="hpx">
      <Mosaic h={h} onOpen={setShow} />

      <div className="hpx-cols">
        <div className="hpx-main">
          <div className="hpx-facts" aria-label="Key facts">
            <Fact icon={<MapPin size={17} />} label="To campus" value={`${h.km} km`} />
            <Fact icon={<Star size={17} />} label="Rating" value={h.nRev ? `${h.rating.toFixed(1)} / 5` : 'New'} />
            <Fact icon={<BedDouble size={17} />} label="Rooms free" value={left === 0 ? 'Full' : String(left)} />
            <Fact icon={<Clock size={17} />} label="Visiting" value={h.visit.replace(/:00/g, '')} />
          </div>

          <section className="hpx-sec" aria-labelledby="hpx-about">
            <h2 id="hpx-about">About this hostel</h2>
            <p className="hpx-about">{h.about}</p>
            <div className="hpx-owner"><Avatar user={{ name: h.ownerName }} size={40} />
              <div className="min0"><b className="ink">Run by {h.ownerName}</b>
                <span className="small muted">{h.verified ? 'ID and proof of ownership checked by Nestly' : 'Not checked by Nestly yet'}</span></div>
              <span className="hpx-qr small muted"><QrCode size={16} />Visitors sign in with a QR code at the gate</span></div>
          </section>

          <section className="hpx-sec" aria-labelledby="hpx-rooms">
            <div className="hpx-sec-head"><h2 id="hpx-rooms">Rooms and prices</h2><span className="small muted">Per semester. Rent is paid to the owner at check-in.</span></div>
            <div className="hpx-rooms" role="radiogroup" aria-labelledby="hpx-rooms">{h.rooms.map((x, i) => {
              const l = x.total - x.taken, full = l <= 0;
              return <button key={x.t} role="radio" aria-checked={room === i} disabled={full} className={'hpx-room' + (room === i ? ' on' : '')} onClick={() => setSel(i)}>
                <span className="hpx-room-top"><b>{x.t}</b><span className="radio" aria-hidden="true" /></span>
                <span className="hpx-room-tags">{x.beds ? <span>{x.beds === 1 ? '1 bed' : `${x.beds} beds`}</span> : null}<span>{x.sc ? 'Own bathroom' : 'Shared bathroom'}</span></span>
                <span className="avail" aria-hidden="true"><i style={{ width: `${x.total ? (x.taken / x.total) * 100 : 100}%` }} /></span>
                <span className="hpx-room-foot"><span className={'small ' + (full ? 'danger-t strong' : l <= 3 ? 'warn-t strong' : 'muted')}>{full ? 'Full this semester' : `${l} of ${x.total} free`}</span>
                  <span className="num"><b className="ink">{ugx(x.price)}</b><span className="muted small"> / sem</span></span></span>
              </button>;
            })}</div>
          </section>

          <section className="hpx-sec" aria-labelledby="hpx-amen">
            <h2 id="hpx-amen">What's included</h2>
            <div className="hpx-amen">{h.amen.map(a => { const I = amenIcon(a); return <span key={a}><span className="icon-tile sm primary"><I size={16} /></span>{AMENITIES[a]}</span>; })}</div>
          </section>

          <section className="hpx-sec" aria-labelledby="hpx-loc">
            <h2 id="hpx-loc">Location</h2>
            <HostelLocation h={h} height={340} />
          </section>

          <section className="hpx-sec" aria-labelledby="hpx-rev">
            <div className="hpx-sec-head"><h2 id="hpx-rev">Reviews</h2>
              {h.nRev ? <span className="row-sm nowrap"><Stars n={Math.round(h.rating)} size={16} /><b className="ink">{h.rating.toFixed(1)}</b><span className="muted small">from {h.nRev} {h.nRev === 1 ? 'student' : 'students'}</span></span> : null}</div>
            {reviews.length ? <div className="hpx-reviews">{reviews.map(v => <article className="hpx-review" key={v.id}>
              <div className="row between"><span className="row-sm min0"><Avatar user={{ name: v.who }} size={32} /><span className="min0"><b className="ink small clamp1">{v.who}</b><span className="tiny muted">{v.when}</span></span></span>
                <button className="rv-report" onClick={() => reportReview(v)} aria-label={`Report the review by ${v.who}`} title="Report this review"><Flag size={14} /></button></div>
              <Stars n={v.stars} size={14} /><p className="small">{v.text}</p>
              {v.reply && <div className="reply small"><b className="ink">Owner reply:</b> {v.reply}</div>}
            </article>)}</div>
              : <p className="muted row-sm"><Star size={15} />No written reviews yet. Only students who stayed here can review.</p>}
          </section>

          <div className="hpx-report"><button className="btn btn-text btn-sm" onClick={() => need('report') && setFlag(true)}><Flag size={15} />Report this listing</button>
            <span className="tiny muted">The owner does not see who reported it.</span></div>
        </div>

        <aside className="card hpx-book" aria-label="Book this hostel">
          <div className="hp-price"><span className="hp-label">{r.t}</span><div className="price">{ugx(r.price)}<span> / semester</span></div></div>
          <div className="hpx-pick" role="radiogroup" aria-label="Room type">{h.rooms.map((x, i) => {
            const full = x.total <= x.taken;
            return <button key={x.t} role="radio" aria-checked={room === i} disabled={full} className={'hpx-pick-row' + (room === i ? ' on' : '')} onClick={() => setSel(i)}>
              <span className="radio" aria-hidden="true" /><span className="min0 grow">{x.t}</span><span className="num small strong nowrap">{full ? 'Full' : ugx(x.price)}</span></button>;
          })}</div>
          <div className="hp-sum">
            <div><span className="muted">Semester</span><span>{sem ? <>{semName(sem)}<span className="tiny muted" style={{ display: 'block', textAlign: 'right' }}>{semDates(sem)}</span></> : 'Not taking bookings'}</span></div>
            <div><span className="muted">Booking fee, pay now</span><span className="num">{ugx(h.fee)}</span></div>
            <div><span className="muted">Rent, pay at check-in</span><span className="num">{ugx(r.price)}</span></div>
          </div>
          <Btn block disabled={!bookable} onClick={() => need('book') && setBooking(true)}>{bookLabel}</Btn>
          <p className="hint row-sm" style={{ justifyContent: 'center' }}><ShieldCheck size={14} color="var(--success)" />Free cancellation for 48 hours</p>
          <details className="hpx-how"><summary>How booking works</summary>
            <ol className="hp-steps">
              <li><span><b>Pay the booking fee</b> with Mobile Money to hold your room.</span></li>
              <li><span><b>The custodian confirms</b> and gives you a room number.</span></li>
              <li><span><b>Pay rent at check-in</b> and move in.</span></li>
            </ol></details>
        </aside>
      </div>
    </div>
    {show !== null && <PhotoViewer h={h} start={show} onClose={() => setShow(null)} />}
    {flow}
  </>;
}

/** Index of the cheapest room type with space left, or the cheapest one when all are full. */
export function cheapestFree(h: Hostel) {
  const idx = h.rooms.map((_, i) => i).sort((a, b) => h.rooms[a]!.price - h.rooms[b]!.price);
  return idx.find(i => h.rooms[i]!.total > h.rooms[i]!.taken) ?? idx[0] ?? 0;
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="hp-fact"><span className="icon-tile sm primary">{icon}</span><span className="min0"><span className="tiny muted">{label}</span><b className="clamp1">{value}</b></span></div>;
}

/** PC photo grid: one big photo and up to four smaller ones. Any photo opens the full-size viewer. */
function Mosaic({ h, onOpen }: { h: Hostel; onOpen: (i: number) => void }) {
  const count = h.photos?.length || 3; const shown = Math.min(count, 5);
  return <div className={`hpx-mosaic n${shown}`}>
    {Array.from({ length: shown }, (_, i) => <button key={i} className={'hpx-shot' + (i === 0 ? ' big' : '')} onClick={() => onOpen(i)} aria-label={`Open photo ${i + 1} of ${count}`}><Art hostel={h} alt={i} /></button>)}
    <button className="hpx-all" onClick={() => onOpen(0)}><Images size={16} />{count === 1 ? 'View photo' : `Show all ${count} photos`}</button>
  </div>;
}

/** Full-size photos, one at a time. Arrow keys and the side buttons move between them. */
function PhotoViewer({ h, start, onClose }: { h: Hostel; start: number; onClose: () => void }) {
  const count = h.photos?.length || 3; const [i, setI] = useState(start);
  const go = (d: number) => setI(x => (x + d + count) % count);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [count]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Overlay title={`${h.name} · photo ${i + 1} of ${count}`} onClose={onClose} width={1040}>
    <div className="pv">
      <div className="pv-img"><Art hostel={h} alt={i} key={i} /></div>
      {count > 1 && <><button className="pv-nav l" onClick={() => go(-1)} aria-label="Previous photo"><ChevronLeft size={22} /></button>
        <button className="pv-nav r" onClick={() => go(1)} aria-label="Next photo"><ChevronRight size={22} /></button></>}
    </div>
    {count > 1 && <div className="pv-strip">{Array.from({ length: count }, (_, k) => <button key={k} className={'pv-thumb' + (k === i ? ' on' : '')} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} aria-pressed={k === i}><Art hostel={h} alt={k} /></button>)}</div>}
  </Overlay>;
}

function Sections({ h, reviews, room, onRoom, onReport }: { h: Hostel; reviews: Review[]; room: number; onRoom: (i: number) => void; onReport: (v: Review) => void }) {
  const dist = distribution(h.rating, h.nRev);
  const maxD = Math.max(...dist, 1);
  return <>
    <Card title="About" subtitle={`Run by ${h.ownerName}`}>
      <p>{h.about}</p>
      <div className="row wrap" style={{ gap: 20, marginTop: 14 }}><span className="row-sm small"><span className="icon-tile sm"><Clock size={16} /></span>Visiting hours {h.visit}</span>
        <span className="row-sm small"><span className="icon-tile sm"><QrCode size={16} /></span>Visitors sign in with a QR code</span></div>
    </Card>
    <Card title="Rooms" subtitle="Pick a room type to see its price"><RoomList h={h} sel={room} onSel={onRoom} /></Card>
    <Card title="Amenities" subtitle={`${h.amen.length} included`}>
      <div className="amen-grid">{h.amen.map(a => { const I = amenIcon(a); return <div key={a}><span className="icon-tile sm primary"><I size={17} /></span>{AMENITIES[a]}</div>; })}</div>
    </Card>
    <Card title="Reviews" subtitle="Only students who stayed here can review">
      <div className="reviews-sum">
        <div><div className="big num">{h.rating.toFixed(1)}</div><Stars n={Math.round(h.rating)} /><p className="small muted" style={{ marginTop: 4 }}>{h.nRev} reviews</p></div>
        <div className="stack-sm">{dist.map((c, i) => <div key={i} className="dist-row"><span className="row-sm" style={{ gap: 2 }}>{5 - i}</span><span className="bar"><i style={{ width: `${(c / maxD) * 100}%` }} /></span><span className="num">{c}</span></div>)}</div>
      </div>
      <div>{reviews.length ? reviews.map(v => <div className="review" key={v.id}>
        <div className="row between wrap"><span className="row-sm"><b className="ink">{v.who}</b><Pill tone="success"><Check size={12} />Stayed here</Pill></span><span className="row-sm"><span className="small muted">{v.when}</span><button className="rv-report" onClick={() => onReport(v)} aria-label={`Report the review by ${v.who}`} title="Report this review"><Flag size={14} /></button></span></div>
        <Stars n={v.stars} /><p>{v.text}</p>{v.reply && <div className="reply"><b className="ink">Owner reply:</b> {v.reply}</div>}</div>)
        : <p className="muted row-sm" style={{ paddingTop: 16 }}><Star size={15} />No written reviews yet.</p>}</div>
    </Card>
  </>;
}

const FLAG_REASONS = ['Fake listing', 'Wrong price', 'Photos do not match', 'Unsafe place', 'Payment not received', 'Something else'];
const REVIEW_REASONS = ['Abusive language', 'Not a real tenant', 'Shares private details', 'Something else'];
/** Report a listing, a payment problem, or one review. */
function ReportListing({ hid, name, review, onClose }: { hid: string; name: string; review?: Review; onClose: () => void }) {
  const me = useMe(); const toast = useToast();
  const [why, setWhy] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const pay = why === 'Payment not received';
  const go = async () => { setBusy(true); await reportListing(me.id, hid, why, text, review ? { kind: 'review', reviewId: review.id } : pay ? { kind: 'payment' } : {}); toast('Thank you. The Nestly team will look into it.'); onClose(); };
  return <Overlay title={review ? 'Report this review' : 'Report a problem'} onClose={onClose} width={460} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!why || (pay && !text.trim())} onClick={go}><Flag size={15} />Send report</Btn></>}>
    <div className="stack">{review ? <div className="hp-review"><b className="small ink">{review.who}</b><p className="small">{review.text}</p></div>
      : <p className="small muted">Tell the Nestly team what is wrong with {name}. The owner does not see who reported it.</p>}
      <div className="chips">{(review ? REVIEW_REASONS : FLAG_REASONS).map(r => <button key={r} className={'chip' + (why === r ? ' on' : '')} aria-pressed={why === r} onClick={() => setWhy(r)}>{r}</button>)}</div>
      {pay && <p className="tiny muted">Nestly does not hold your money; the fee went straight to the owner. We contact them and follow it up with you.</p>}
      <div className="field"><label htmlFor="fl-t">{pay ? 'When did you pay, and how?' : 'What happened? (optional)'}</label><textarea id="fl-t" className="input" rows={3} maxLength={300} value={text} onChange={e => setText(e.target.value)}
        placeholder={pay ? 'For example: I paid UGX 40,000 by MTN on 6 Nov, reference MP261106.1203' : 'For example: the custodian asked for more than the price shown'} /></div>
    </div></Overlay>;
}
