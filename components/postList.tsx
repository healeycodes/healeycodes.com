import Link from "next/link";
import Date_ from "./date";
import { postStars } from '../data/posts'
import siteConfig from '../siteConfig.json'

const PostStar = <>
  <span className="star-container" title="star">*</span>
  <style jsx>{`
  .star-container {
    font-size: 32px;
    color: var(--text);
    position: relative;
    top: 11px;

    margin-left: -21px;
    padding-right: 2px;
  }
  @media only screen and (max-width: ${siteConfig.LAYOUT_WIDTH}px) {
    .star-container {
      margin-left: initial;
      padding-right: initial
    }
  }
`}</style>
</>

export default function PostList({ posts, showYears=false }) {
  const years: Record<number, any> = {};
  posts.forEach(post => {
    const postDate = new Date(post.date);
    if (years[postDate.getFullYear()]) {
      years[postDate.getFullYear()].push(post)
    } else {
      years[postDate.getFullYear()] = [post]
    }
  });

  if (showYears) {
    const ret = [];
    Object.keys(years)
      .sort((a, z) => parseInt(z) - parseInt(a))
      .forEach((year, i) => {
        if (i !== 0) {
          ret.push(<h2 key={year}>{year}</h2>)
        }
        years[year].forEach(post => {
          ret.push(Post(post, postStars.includes(post.id)))
        })
      })
    return <div>{ret}</div>
  }

  return (
    <div>
      {posts.map(post => Post(post, false))}
    </div>
  );
}

function Post({ id, description, date, title, tags }, withStar: boolean) {
  return <div key={id}>
    <div className="post">
      <Link href={`/${id}`} legacyBehavior>
        <a>{withStar ? PostStar : null} {title}</a>
      </Link>
      <p className="post-desc">{description}</p>
      <p className="post-date">
        <Date_ dateString={date} />
      </p>
    </div>
    <style jsx>{`
        .post {
          padding-bottom: 18px;
        }
        .post-desc {
          margin-top: 4px;
          margin-bottom: 0px;
        }
        .post-date {
          margin-top: 0px;
          color: var(--light-text);
        }
      `}</style>
  </div>
}
