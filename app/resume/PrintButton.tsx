// downloads the actual PDF instead of printing the page, since browser printing is different everywhere
export default function PrintButton() {
  return (
    <a className="btn btn-brass" href="/Ansh_Rajput_Resume.pdf" download="Ansh_Rajput_Resume.pdf">
      Download PDF
    </a>
  );
}
