import { FacebookIcon, InstagramIcon, MailIcon, TwitterIcon, YoutubeIcon } from "lucide-react";

export const MainFooter = () => {
  return (
    <footer id="footer">
      <hr className="w-11/12 mx-auto" />

      <section className="flex flex-row items-center justify-center space-x-4 py-4">
        
        <FacebookIcon size={32} color={"#737373"}/><TwitterIcon size={32} color={"#737373"}/><MailIcon size={32} color={"#737373"}/>
        <InstagramIcon size={32} color={"#737373"}/><YoutubeIcon size={32} color={"#737373"}/>
      </section>

      <section className="pb-14 flex flex-row items-center justify-center text-muted-foreground">
        <h3>
          &copy; 2025 Coyright Covia 
         
        </h3>
      </section>
    </footer>
  );
};
