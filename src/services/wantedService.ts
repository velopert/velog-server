import axios from 'axios';

const wantedApiId = process.env.WANTED_API_ID;
const wantedApiKey = process.env.WANTED_API_SECRET;
const wantedApiHost = process.env.WANTED_API_HOST;

const categories = {
  frontend: [669],
  backend: [872],
  python: [899],
  node: [895],
  mobile: [677, 678, 10111],
  ai: [1634],
};

export type JobCategory = keyof typeof categories;
export function isJobCategory(category: string | undefined): category is JobCategory | undefined {
  //check categories has key
  if (category === undefined) return true;
  return category in categories;
}

export const wantedService = {
  async getJobPositions(category?: JobCategory) {
    const categoryParams = category
      ? categories[category].map(c => `subcategory_tags=${c}`).join('&')
      : 'category_tag=518';
    const params = '?sort=job.popularity_order&offset=0&limit=10&'.concat(categoryParams);

    console.log(params);

    const response = await axios.get<WantedJobResponse>(
      `https://${wantedApiHost}/v2/jobs`.concat(params),
      {
        headers: {
          'wanted-client-id': wantedApiId,
          'wanted-client-secret': wantedApiKey,
        },
      }
    );
    const jobs = response.data.data.map(d => ({
      id: d.id,
      name: d.name,
      companyName: d.company.name,
      companyLogo: d.logo_img.thumb,
      thumbnail: d.title_img.thumb,
      url: d.url,
    }));

    const shuffledJobs = jobs.sort(() => 0.5 - Math.random());
    return shuffledJobs.slice(0, 4);
  },
};

type JobPosition = {
  id: number;
  status: string;
  due_time: string | null;
  name: string;
  company: {
    id: number;
    name: string;
  };
  reward: {
    total: string;
    recommender: string;
    recommendee: string;
  };
  address: {
    country: string;
    location: string;
    full_location: string;
  };
  title_img: {
    origin: string;
    thumb: string;
  };
  logo_img: {
    origin: string;
    thumb: string;
  };
  category_tags: {
    parent_tag: {
      id: number;
      title: string;
    };
    child_tags: {
      id: number;
      title: string;
    }[];
  };
  url: string;
};

type WantedJobResponse = {
  links: any;
  data: JobPosition[];
};
